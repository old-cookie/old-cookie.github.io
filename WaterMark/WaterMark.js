// WaterMark.js — 浮水印合成與主流程串接（協調層，不承擔細節實作）
// 依賴載入順序：State.js → File.js → Cropper.js → UI.js → WaterMark.js

/* ── 產生輸出檔名 ── */
function getEditedImageFilename(originalFilename, index) {
  if (typeof originalFilename === "string" && originalFilename.trim()) {
    const lastDotIndex = originalFilename.lastIndexOf(".");
    if (lastDotIndex > 0) return `${originalFilename.slice(0, lastDotIndex)}_edited.png`;
    return `${originalFilename}_edited.png`;
  }
  return `edited_image_${index + 1}.png`;
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

/* ── 文字備援浮水印 ── */
function addTextWatermark(ctx, canvas) {
  const text = "© WaterMark";
  ctx.font = `bold ${canvas.width / 30}px Arial`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, canvas.width - 10, canvas.height - 10);
}

/* ── 合成單張圖片（裁切 + 浮水印）── */
async function compositeImage(cropper, originalFilename, index) {
  const canvas = await getCroppedCanvasFromInstance(cropper);
  if (!canvas) throw new Error("無法取得裁切畫布。請確認 Cropper.js 載入是否成功。");

  const imageData = canvas.toDataURL("image/png");

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = imageData;
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
          resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getEditedImageFilename(originalFilename, index) });
        };
        watermark.onload = () => {
          const wmWidth = finalCanvas.width / 5;
          const wmHeight = (watermark.height / watermark.width) * wmWidth;
          ctx.drawImage(watermark, finalCanvas.width - wmWidth - 10, finalCanvas.height - wmHeight - 10, wmWidth, wmHeight);
          resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getEditedImageFilename(originalFilename, index) });
        };
      } else {
        addTextWatermark(ctx, finalCanvas);
        resolve({ dataURL: finalCanvas.toDataURL("image/png"), filename: getEditedImageFilename(originalFilename, index) });
      }
    };
  });
}

/* ── 主流程：處理所有圖片 ── */
async function processImages() {
  editedImages = [];
  processBtn.disabled = true;
  processBtn.textContent = "處理中...";

  const imageContainers = Array.from(imagesContainer.querySelectorAll(".image-container"));

  try {
    const results = await Promise.all(
      cropperInstances.map((cropper, index) =>
        compositeImage(cropper, imageContainers[index]?.dataset.filename, index).catch((err) => {
          console.error(err);
          alert(err.message);
          return null;
        })
      )
    );

    editedImages = results.filter(Boolean);
    UI_displayPreview();
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = "處理圖片";
  }
}

/* ── 事件綁定 ── */
processBtn.addEventListener("click", () => {
  if (cropperInstances.length === 0) {
    alert("請先上傳並配置照片。");
    return;
  }
  processImages();
});

/* ── 初始化 ── */
function initApp() {
  UI_updateProcessButton();
}

document.addEventListener("DOMContentLoaded", initApp);
