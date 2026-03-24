// @charset "utf-8";

/**
 * WaterMark 照片編輯和水印處理腳本
 * 版本: 3.1.0
 * 描述: 提供照片上傳、編輯、添加水印及下載功能
 * 作者: OldCookie
 * 建立日期: 2025年
 *
 * 依賴項:
 * - Cropper.js v1.6.2
 *
 * 主要功能:
 * - 拖放式照片上傳
 * - 支持多張照片處理 (最多4張)
 * - 圖片裁剪 (自由比例、16:9、3:4)
 * - 自動添加水印
 * - 批量下載處理後的圖片
 */

// 全局變量
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const imagesContainer = document.getElementById("imagesContainer");
const previewSection = document.getElementById("previewSection");
const previewContainer = document.getElementById("previewContainer");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const processBtn = document.getElementById("processBtn");

let cropperInstances = [];
let cropperMap = new Map();
let editedImages = [];
let isMobile = window.innerWidth <= 768;
let resizeObserver;

function refreshCropperLayout(cropper) {
  if (!cropper) return;

  if (typeof cropper.resize === "function") {
    cropper.resize();
  }
}

function keepImageInsideCanvas(cropper) {
  if (!cropper) return;

  if (
    typeof cropper.getCanvasData === "function" &&
    typeof cropper.getContainerData === "function" &&
    typeof cropper.setCanvasData === "function"
  ) {
    const canvasData = cropper.getCanvasData();
    const containerData = cropper.getContainerData();

    if (!canvasData || !containerData) return;

    const centeredLeft = (containerData.width - canvasData.width) / 2;
    const centeredTop = (containerData.height - canvasData.height) / 2;

    if (
      Math.abs(canvasData.left - centeredLeft) > 0.5 ||
      Math.abs(canvasData.top - centeredTop) > 0.5
    ) {
      cropper.setCanvasData({
        left: centeredLeft,
        top: centeredTop,
      });
    }

    return;
  }

  if (typeof cropper.moveTo === "function") {
    const canvasData = cropper.getCanvasData?.();
    if (canvasData) {
      cropper.moveTo(canvasData.left, canvasData.top);
    }
  }
}

function fitImageToContainer(cropper) {
  if (!cropper) return;

  if (
    typeof cropper.getContainerData !== "function" ||
    typeof cropper.getCanvasData !== "function" ||
    typeof cropper.zoomTo !== "function"
  ) {
    keepImageInsideCanvas(cropper);
    return;
  }

  const containerData = cropper.getContainerData();
  const canvasData = cropper.getCanvasData();

  if (!containerData || !canvasData) {
    keepImageInsideCanvas(cropper);
    return;
  }

  if (canvasData.naturalWidth <= 0 || canvasData.naturalHeight <= 0) {
    keepImageInsideCanvas(cropper);
    return;
  }

  const isPortrait = canvasData.naturalHeight > canvasData.naturalWidth;
  const isLandscape = canvasData.naturalWidth > canvasData.naturalHeight;

  let targetZoom;

  if (isPortrait) {
    targetZoom = containerData.height / canvasData.naturalHeight;
  } else if (isLandscape) {
    targetZoom = containerData.width / canvasData.naturalWidth;
  } else {
    targetZoom = Math.min(
      containerData.width / canvasData.naturalWidth,
      containerData.height / canvasData.naturalHeight,
    );
  }

  if (Number.isFinite(targetZoom) && targetZoom > 0) {
    cropper.zoomTo(targetZoom);
  }

  requestAnimationFrame(() => {
    keepImageInsideCanvas(cropper);
  });
}

function resolveCropperConstructor() {
  const globalCropper = window.Cropper;

  if (typeof globalCropper === "function") {
    return globalCropper;
  }

  return null;
}

function setCropperAspectRatio(cropper, ratio) {
  if (typeof cropper.setAspectRatio === "function") {
    cropper.setAspectRatio(ratio);
  }
}

function fitCropBoxToCanvas(cropper) {
  if (
    !cropper ||
    typeof cropper.getCanvasData !== "function" ||
    typeof cropper.setCropBoxData !== "function"
  ) {
    return;
  }

  const canvasData = cropper.getCanvasData();
  if (!canvasData) return;

  cropper.setCropBoxData({
    left: canvasData.left,
    top: canvasData.top,
    width: canvasData.width,
    height: canvasData.height,
  });
}

async function getCroppedCanvasFromInstance(cropper) {
  if (typeof cropper.getCroppedCanvas === "function") {
    return cropper.getCroppedCanvas({ imageSmoothingQuality: "high" });
  }

  return null;
}

// 檢查水印圖片是否存在
function checkWatermarkExists() {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(true);
    };
    img.onerror = () => {
      resolve(false);
    };
    img.src = "assets/Cherryneko_Watermark_WithNameXUsername.svg";
  });
}

// 創建默認水印
async function createDefaultWatermark() {
  const watermarkExists = await checkWatermarkExists();

  if (!watermarkExists) {
    console.warn("水印圖片未找到，將使用默認文字水印");
  }
}

// 初始化應用程序
function initApp() {
  createDefaultWatermark();
  updateProcessButtonVisibility();
}

function initResizeObserver() {
  if (resizeObserver) return;

  resizeObserver = new ResizeObserver(() => {
    cropperMap.forEach((cropper, wrapper) => {
      if (document.contains(wrapper)) {
        refreshCropperLayout(cropper);
        fitImageToContainer(cropper);
      }
    });
  });
}

// 監聽視窗大小變化以更新移動裝置狀態與重繪裁切器
window.addEventListener("resize", function () {
  isMobile = window.innerWidth <= 768;
  cropperInstances.forEach((cropper) => {
    refreshCropperLayout(cropper);

    setTimeout(() => {
      fitImageToContainer(cropper);
    }, 0);
  });
});

// 處理拖曳
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (uploadArea.classList.contains("hidden")) return;
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  if (uploadArea.classList.contains("hidden")) return;
  uploadArea.classList.remove("dragover");
  const files = e.dataTransfer.files;
  handleFiles(files);
});

// 處理點擊上傳
uploadArea.addEventListener("click", () => {
  if (uploadArea.classList.contains("hidden")) return;
  fileInput.click();
});

uploadArea.addEventListener("keydown", (event) => {
  if (uploadArea.classList.contains("hidden")) return;
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

// 處理文件選擇
fileInput.addEventListener("change", (e) => {
  const files = e.target.files;
  handleFiles(files);
  fileInput.value = ""; // 重設文件輸入
});

// 處理上傳的文件
function handleFiles(files) {
  const existingFiles =
    imagesContainer.querySelectorAll(".image-container").length;
  const totalFiles = existingFiles + files.length;

  if (totalFiles > 4) {
    alert("您最多可以上傳4張照片。");
    return;
  }

  // 限制檔案大小 (10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes

  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) {
      alert(`"${file.name}" 不是有效的圖片檔案。`);
      return;
    }

    if (file.size > maxSize) {
      alert(`"${file.name}" 檔案太大（超過10MB）。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageContainer = document.createElement("div");
      imageContainer.classList.add("card", "image-container");

      // 取消按鈕（位於裁剪區域上方）
      const cancelBtn = document.createElement("button");
      cancelBtn.classList.add("cancel-button");
      cancelBtn.type = "button";
      cancelBtn.dataset.variant = "danger";
      cancelBtn.textContent = "取消";
      cancelBtn.setAttribute("aria-label", "取消此照片");
      imageContainer.appendChild(cancelBtn);

      const imgWrapper = document.createElement("article");
      imgWrapper.classList.add("card", "image-cropper");

      const img = document.createElement("img");
      img.src = event.target.result;
      img.alt = file.name;
      // 防止圖片拖曳
      img.draggable = false;

      imgWrapper.appendChild(img);
      imageContainer.appendChild(imgWrapper);

      // 裁剪比例控制
      const controls = document.createElement("menu");
      controls.classList.add("buttons", "controls");
      controls.setAttribute("aria-label", "裁剪比例");

      // 裁剪比例按鈕
      const aspectFree = document.createElement("button");
      aspectFree.classList.add("outline", "aspect-btn");
      aspectFree.type = "button";
      aspectFree.textContent = "自由";
      // 使用 "free" 作為資料屬性以表示「自由比例 / 無固定裁剪比例」，
      // 取代先前可能使用的 "NaN" 字串；其他程式邏輯請以 "free" 作為語意旗標。
      aspectFree.dataset.ratio = "free";
      aspectFree.setAttribute("aria-label", "自由比例裁剪");
      aspectFree.setAttribute("aria-pressed", "false");

      const aspect169 = document.createElement("button");
      aspect169.classList.add("outline", "aspect-btn");
      aspect169.type = "button";
      aspect169.textContent = "16:9";
      aspect169.dataset.ratio = "16:9";
      aspect169.setAttribute("aria-label", "16:9 比例裁剪");
      aspect169.setAttribute("aria-pressed", "true");

      const aspect34 = document.createElement("button");
      aspect34.classList.add("outline", "aspect-btn");
      aspect34.type = "button";
      aspect34.textContent = "4:5";
      aspect34.dataset.ratio = "4:5";
      aspect34.setAttribute("aria-label", "4:5 比例裁剪");
      aspect34.setAttribute("aria-pressed", "false");

      const freeItem = document.createElement("li");
      freeItem.appendChild(aspectFree);
      const ratio169Item = document.createElement("li");
      ratio169Item.appendChild(aspect169);
      const ratio45Item = document.createElement("li");
      ratio45Item.appendChild(aspect34);

      controls.appendChild(freeItem);
      controls.appendChild(ratio169Item);
      controls.appendChild(ratio45Item);

      imageContainer.appendChild(controls);
      imagesContainer.appendChild(imageContainer);

      // 初始化 Cropper
      const CropperClass = resolveCropperConstructor();
      if (!CropperClass) {
        console.error(
          "Cropper.js 載入失敗：找不到可用的 Cropper constructor。",
        );
        alert("Cropper.js 載入失敗，請重新整理頁面後再試。");
        imageContainer.remove();
        return;
      }

      let cropper;
      try {
        cropper = new CropperClass(img, {
          container: imgWrapper,
          viewMode: 2,
          autoCropArea: 1,
          responsive: true,
          restore: false,
          background: false,
          movable: false,
          zoomable: true,
          zoomOnTouch: false,
          zoomOnWheel: false,
          scalable: false,
          rotatable: false,
          ready() {
            fitImageToContainer(cropper);
            requestAnimationFrame(() => {
              fitImageToContainer(cropper);
            });
          },
          cropmove() {
            keepImageInsideCanvas(cropper);
          },
          cropend() {
            keepImageInsideCanvas(cropper);
          },
          zoom() {
            keepImageInsideCanvas(cropper);
          },
        });
      } catch (error) {
        console.error("建立 Cropper 實例失敗：", error);
        alert("建立裁剪器失敗，請重新整理頁面後再試。");
        imageContainer.remove();
        return;
      }

      setTimeout(() => {
        setCropperAspectRatio(cropper, 16 / 9);
        fitImageToContainer(cropper);
      }, 0);

      cropperInstances.push(cropper);
      cropperMap.set(imgWrapper, cropper);

      initResizeObserver();
      resizeObserver.observe(imgWrapper);

      // 設置默認活躍的裁剪比例按鈕
      aspect169.classList.add("active");

      // 裁剪比例按鈕點擊事件
      [aspectFree, aspect169, aspect34].forEach((button) => {
        button.addEventListener("click", () => {
          // 移除所有按鈕的 'active' 類
          [aspectFree, aspect169, aspect34].forEach((btn) => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
          });
          // 為被點擊的按鈕添加 'active' 類
          button.classList.add("active");
          button.setAttribute("aria-pressed", "true");
          // 設置相應的裁剪比例
          const ratio = button.dataset.ratio;
          if (ratio === "free") {
            setCropperAspectRatio(cropper, NaN);
            fitCropBoxToCanvas(cropper);
          } else if (ratio === "16:9") {
            setCropperAspectRatio(cropper, 16 / 9);
          } else {
            setCropperAspectRatio(cropper, 4 / 5);
          }

          setTimeout(() => {
            fitImageToContainer(cropper);
          }, 0);
        });
      });

      // 取消按鈕行為
      cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isSure = cancelBtn.classList.contains("sure");

        if (!isSure) {
          // 改變按鈕文字為 "確定？"
          cancelBtn.textContent = "確定？";
          cancelBtn.classList.add("sure");
          cancelBtn.dataset.variant = "danger";

          // 監聽頁面上的點擊事件以重置按鈕
          document.addEventListener("click", resetCancelButtons);
        } else {
          // 移除該照片
          removePhoto(imageContainer, cropper);
        }
      });

      // 更新 "處理圖片" 按鈕的顯示狀態
      updateProcessButtonVisibility();
    };
    reader.readAsDataURL(file);
  });
}

// 函數：重置所有 "確定？" 按鈕回 "取消"
function resetCancelButtons(event) {
  const activeSureButtons = document.querySelectorAll(".cancel-button.sure");
  activeSureButtons.forEach((button) => {
    button.textContent = "取消";
    button.classList.remove("sure");
    button.dataset.variant = "danger";
  });
  document.removeEventListener("click", resetCancelButtons);
}

// 函數：移除照片
function removePhoto(imageContainer, cropper) {
  // 銷毀 Cropper 實例
  if (typeof cropper.destroy === "function") {
    cropper.destroy();
  }

  const index = cropperInstances.indexOf(cropper);
  if (index > -1) {
    cropperInstances.splice(index, 1);
  }

  const wrapper = Array.from(cropperMap.entries()).find(
    ([, c]) => c === cropper,
  )?.[0];
  if (wrapper) {
    resizeObserver?.unobserve(wrapper);
    cropperMap.delete(wrapper);
  }

  // 從 DOM 中移除圖片容器
  imageContainer.remove();
  // 更新 "處理圖片" 按鈕的顯示狀態
  updateProcessButtonVisibility();
  // 如果照片數少於4，重新顯示上傳區域
  if (imagesContainer.querySelectorAll(".image-container").length < 4) {
    uploadArea.classList.remove("hidden");
  }
}

// 函數：添加水印並準備預覽
function processImages() {
  editedImages = [];

  // 更新處理按鈕狀態
  processBtn.disabled = true;
  processBtn.textContent = "處理中...";

  const promises = cropperInstances.map((cropper) => {
    return new Promise(async (resolve) => {
      const canvas = await getCroppedCanvasFromInstance(cropper);

      if (!canvas) {
        console.error("無法取得裁切畫布。請確認 Cropper.js 載入是否成功。");
        alert("無法取得裁切畫布，請重新整理頁面後再試。");
        resolve();
        return;
      }

      // 獲取裁剪後的圖像數據
      let imageData = canvas.toDataURL("image/png");

      // 創建新圖像以添加水印
      const img = new Image();
      img.src = imageData;

      img.onload = async () => {
        const finalCanvas = document.createElement("canvas");
        finalCanvas.width = img.width;
        finalCanvas.height = img.height;

        const ctx = finalCanvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const watermarkExists = await checkWatermarkExists();

        if (watermarkExists) {
          const watermark = new Image();
          watermark.src = "assets/Cherryneko_Watermark_WithNameXUsername.svg";
          watermark.setAttribute("crossOrigin", "Anonymous");

          watermark.onload = () => {
            // 計算水印大小（圖片寬度的1/5）
            const wmWidth = finalCanvas.width / 5;
            const wmHeight = (watermark.height / watermark.width) * wmWidth;

            // 水印位置設置為右下角，10px 從邊緣
            ctx.drawImage(
              watermark,
              finalCanvas.width - wmWidth - 10,
              finalCanvas.height - wmHeight - 10,
              wmWidth,
              wmHeight,
            );

            const dataURL = finalCanvas.toDataURL("image/png");
            editedImages.push(dataURL);
            resolve();
          };

          watermark.onerror = () => {
            addTextWatermark(ctx, finalCanvas);
            const dataURL = finalCanvas.toDataURL("image/png");
            editedImages.push(dataURL);
            resolve();
          };
        } else {
          addTextWatermark(ctx, finalCanvas);
          const dataURL = finalCanvas.toDataURL("image/png");
          editedImages.push(dataURL);
          resolve();
        }
      };

      img.onerror = () => {
        console.error("處理圖像時出錯。");
        alert("處理圖像時出錯。");
        resolve();
      };
    });
  });

  Promise.all(promises).then(() => {
    displayPreview();
    // 恢復按鈕狀態
    processBtn.disabled = false;
    processBtn.textContent = "處理圖片";
  });
}

// 添加文字水印（當圖片水印不可用時）
function addTextWatermark(ctx, canvas) {
  const text = "© WaterMark";
  ctx.font = "bold " + canvas.width / 30 + "px Arial";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, canvas.width - 10, canvas.height - 10);
}

// 函數：顯示預覽
function displayPreview() {
  previewContainer.innerHTML = "";
  editedImages.forEach((dataURL, index) => {
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "preview-item";

    const img = document.createElement("img");
    img.src = dataURL;
    img.alt = `編輯後的照片 ${index + 1}`;
    img.draggable = false;

    // 添加單獨下載按鈕
    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "download-single-button";
    downloadBtn.innerHTML = "下載";
    downloadBtn.setAttribute("aria-label", `下載照片 ${index + 1}`);
    downloadBtn.addEventListener("click", () => {
      downloadImage(dataURL, `edited_image_${index + 1}.png`);
    });

    imgWrapper.appendChild(img);
    const actions = document.createElement("menu");
    actions.className = "buttons";
    actions.appendChild(downloadBtn);

    imgWrapper.appendChild(actions);
    previewContainer.appendChild(imgWrapper);
  });

  previewSection.hidden = false;
  // 滾動到預覽區域
  previewSection.scrollIntoView({ behavior: "smooth" });
}

// 函數：下載單張圖片
function downloadImage(dataURL, filename) {
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 函數：下載所有圖片
downloadAllBtn.addEventListener("click", () => {
  downloadAllImages();
});

function downloadAllImages() {
  if (editedImages.length === 0) {
    alert("沒有可下載的圖片。");
    return;
  }

  // 在移動裝置上一次下載多個檔案可能有問題，提供提示
  if (isMobile && editedImages.length > 1) {
    alert(
      "即將下載所有圖片。如果您使用的是移動裝置，可能需要點擊每張圖片下方的下載按鈕個別下載。",
    );
  }

  editedImages.forEach((dataURL, index) => {
    // 添加延遲避免瀏覽器阻擋多個下載
    setTimeout(() => {
      downloadImage(dataURL, `edited_image_${index + 1}.png`);
    }, index * 500);
  });
}

// 處理 "處理圖片" 按鈕點擊
processBtn.addEventListener("click", () => {
  if (cropperInstances.length === 0) {
    alert("請先上傳並配置照片。");
    return;
  }
  processImages();
});

// 函數：更新 "處理圖片" 按鈕和上傳區域的顯示狀態
function updateProcessButtonVisibility() {
  const totalImages =
    imagesContainer.querySelectorAll(".image-container").length;
  if (totalImages > 0) {
    processBtn.hidden = false;
  } else {
    processBtn.hidden = true;
    // 隱藏預覽區域
    previewSection.hidden = true;
  }

  if (totalImages >= 4) {
    uploadArea.classList.add("hidden"); // 隱藏上傳區域
  } else {
    uploadArea.classList.remove("hidden"); // 顯示上傳區域
  }
}

// 啟動應用程序
document.addEventListener("DOMContentLoaded", initApp);
