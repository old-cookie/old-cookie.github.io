// File.js — 檔案驗證、載入與下載
// 依賴：State.js（需先載入）

fileInput.addEventListener("change", (e) => {
  handleFiles(e.target.files);
  fileInput.value = ""; // 清空 input，允許重複選同一檔案
});

/* ── 檔案驗證與載入 ── */
function handleFiles(files) {
  const fileList = Array.from(files);
  const existingCount = imagesContainer.querySelectorAll(".image-container").length;
  if (existingCount + fileList.length > 10) {
    alert("您最多可以上傳10張照片。");
    return;
  }

  const validFiles = fileList.filter((file) => {
    if (!file.type.startsWith("image/")) {
      alert(`"${file.name}" 不是有效的圖片檔案。`);
      return false;
    }
    return true;
  });

  if (validFiles.length === 0) return;

  Promise.all(validFiles.map((file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageContainer = UI_createImageCard(file.name, event.target.result);
      imagesContainer.appendChild(imageContainer);
      resolve();
    };
    reader.readAsDataURL(file);
  }))).then(() => {
    UI_updateProcessButton();
    processImages();
  });
}

/* ── 單張下載 ── */
function downloadImage(dataURL, filename) {
  const link = document.createElement("a");
  link.href = dataURL;
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


