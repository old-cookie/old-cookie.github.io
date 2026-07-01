// File.js — 上傳、拖放、檔案驗證、輸入清空、單張與全部下載
// 依賴：State.js（需先載入）

/* ── 上傳區 drag-and-drop ── */
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
  handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
  fileInput.value = ""; // 清空 input，允許重複選同一檔案
});

/* ── 檔案驗證與載入 ── */
function handleFiles(files) {
  const existingCount = imagesContainer.querySelectorAll(".image-container").length;
  if (existingCount + files.length > 4) {
    alert("您最多可以上傳4張照片。");
    return;
  }

  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) {
      alert(`"${file.name}" 不是有效的圖片檔案。`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      // 將圖片資料交給 UI.js 建立卡片，並由 Cropper.js 初始化裁切器
      const imageContainer = UI_createImageCard(file.name, event.target.result);
      imagesContainer.appendChild(imageContainer);

      const imgEl      = imageContainer.querySelector("img");
      const imgWrapper = imageContainer.querySelector(".image-cropper");
      const ratioButtons = Array.from(imageContainer.querySelectorAll(".controls button"));

      Cropper_init(imgEl, imgWrapper, ratioButtons, imageContainer);
      UI_updateProcessButton();
    };
    reader.readAsDataURL(file);
  });
}

/* ── 單張下載 ── */
function downloadImage(dataURL, filename) {
  const link = document.createElement("a");
  link.href     = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ── 全部下載 ── */
downloadAllBtn.addEventListener("click", downloadAllImages);

function downloadAllImages() {
  if (editedImages.length === 0) {
    alert("沒有可下載的圖片。");
    return;
  }
  editedImages.forEach((image, index) => {
    setTimeout(() => downloadImage(image.dataURL, image.filename), index * 500);
  });
}

/* ── 取消／移除照片 ── */
function resetCancelButtons() {
  document.querySelectorAll(".cancel-button.sure").forEach((btn) => {
    btn.textContent = "取消";
    btn.classList.remove("sure");
  });
  document.removeEventListener("click", resetCancelButtons);
}

function removePhoto(imageContainer, cropper) {
  if (typeof cropper.destroy === "function") cropper.destroy();

  const idx = cropperInstances.indexOf(cropper);
  if (idx > -1) cropperInstances.splice(idx, 1);

  const wrapper = [...cropperMap.entries()].find(([, c]) => c === cropper)?.[0];
  if (wrapper) {
    resizeObserver?.unobserve(wrapper);
    cropperMap.delete(wrapper);
  }

  imageContainer.remove();
  UI_updateProcessButton();

  if (imagesContainer.querySelectorAll(".image-container").length < 4) {
    uploadArea.classList.remove("hidden");
  }
}
