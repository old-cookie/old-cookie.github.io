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

/* ── 浮水印存在確認 ── */
function checkWatermarkExists() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = "assets/Cherryneko_Watermark_WithNameXUsername.svg";
  });
}

/* ── 合成單張圖片（直接加入浮水印）── */
async function compositeImage(imageDataURL, originalFilename, index) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageDataURL;
    img.onerror = () => reject(new Error("處理圖像時出錯。"));

    img.onload = async () => {
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = img.width;
      finalCanvas.height = img.height;
      const ctx = finalCanvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const watermarkExists = await checkWatermarkExists();

      if (watermarkExists) {
        const watermark = new Image();
        watermark.setAttribute("crossOrigin", "Anonymous");
        watermark.src = "assets/Cherryneko_Watermark_WithNameXUsername.svg";
        watermark.onerror = () => {
          addTextWatermark(ctx, finalCanvas);
          resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getWatermarkedImageFilename(originalFilename, index) });
        };
        watermark.onload = () => {
          const wmWidth = finalCanvas.width / 5;
          const wmHeight = (watermark.height / watermark.width) * wmWidth;
          ctx.drawImage(watermark, finalCanvas.width - wmWidth - 10, finalCanvas.height - wmHeight - 10, wmWidth, wmHeight);
          resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getWatermarkedImageFilename(originalFilename, index) });
        };
      } else {
        addTextWatermark(ctx, finalCanvas);
        resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getWatermarkedImageFilename(originalFilename, index) });
      }
    };
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
