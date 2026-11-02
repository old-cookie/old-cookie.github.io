// WaterMark.js — 直接將浮水印加入圖片

/* ── 產生輸出檔名 ── */
function getWatermarkedImageFilename(originalFilename, index) {
  if (typeof originalFilename === "string" && originalFilename.trim()) {
    const lastDotIndex = originalFilename.lastIndexOf(".");
    if (lastDotIndex > 0) return `${originalFilename.slice(0, lastDotIndex)}_watermarked.png`;
    return `${originalFilename}_watermarked.png`;
  }
  return `watermarked_image_${index + 1}.png`;
}

/* ── 浮水印快取（僅載入一次）── */
let _wmImage = null;
function getWatermarkImage() {
  if (!_wmImage) {
    _wmImage = new Image();
    _wmImage.setAttribute("crossOrigin", "Anonymous");
    _wmImage.src = "assets/Cherryneko_Watermark_WithNameXUsername.svg";
  }
  return _wmImage;
}
function checkWatermarkExists() {
  return new Promise((resolve) => {
    const wm = getWatermarkImage();
    if (wm.complete && wm.naturalWidth > 0) return resolve(true);
    wm.onload = () => resolve(true);
    wm.onerror = () => resolve(false);
  });
}

function addTextWatermark(ctx, canvas) {
  // Fallback: draw a simple text watermark when the SVG fails to load.
  ctx.save();
  ctx.font = "bold 24px sans-serif";
  ctx.fillStyle = "rgba(128, 128, 128, 0.5)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("SAMPLE", canvas.width - 10, canvas.height - 10);
  ctx.restore();
}

/* ── 合成單張圖片（直接加入浮水印）── */
function drawWatermark(wm, ctx, finalCanvas) {
  const wmWidth = finalCanvas.width / 5;
  const wmHeight = (wm.height / wm.width) * wmWidth;
  ctx.drawImage(wm, finalCanvas.width - wmWidth - 10, finalCanvas.height - wmHeight - 10, wmWidth, wmHeight);
}
async function compositeImage(imageDataURL, originalFilename, index) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("處理圖像時出錯。"));

    img.onload = () => {
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = img.width;
      finalCanvas.height = img.height;
      const ctx = finalCanvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const wm = getWatermarkImage();
      if (wm.complete && wm.naturalWidth > 0) {
        drawWatermark(wm, ctx, finalCanvas);
        resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getWatermarkedImageFilename(originalFilename, index), originalFilename });
      } else if (wm.complete && wm.naturalWidth === 0) {
        // Watermark already failed to load earlier; use text fallback immediately.
        addTextWatermark(ctx, finalCanvas);
        resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getWatermarkedImageFilename(originalFilename, index), originalFilename });
      } else {
        const onWmLoad = () => {
          drawWatermark(wm, ctx, finalCanvas);
          resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getWatermarkedImageFilename(originalFilename, index), originalFilename });
        };
        const onWmError = () => {
          addTextWatermark(ctx, finalCanvas);
          resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getWatermarkedImageFilename(originalFilename, index), originalFilename });
        };
        wm.addEventListener("load", onWmLoad, { once: true });
        wm.addEventListener("error", onWmError, { once: true });
      }
    };

    img.src = imageDataURL;
  });
}

/* ── 主流程：處理所有圖片 ── */
async function processImages() {
  const imageContainers = Array.from(imagesContainer.querySelectorAll(".image-container"));
  if (imageContainers.length === 0) {
    previewSection.hidden = true;
    return;
  }

  previewSection.hidden = true;
  editedImages = [];

  try {
    const results = await Promise.all(
      imageContainers.map((container, index) => {
        const imgEl = container.querySelector("img");
        return compositeImage(imgEl?.src, container.dataset.filename, index).catch((err) => {
          console.error(err);
          alert(err.message);
          return null;
        });
      })
    );

    editedImages = results.filter(Boolean);
    imagesContainer.innerHTML = "";
    UI_displayPreview();
  } catch (err) {
    console.error(err);
    alert(err.message || "處理圖像時出錯。");
  }
}

/* ── 初始化 ── */
function initApp() {
  UI_updateProcessButton();
}

document.addEventListener("DOMContentLoaded", initApp);
