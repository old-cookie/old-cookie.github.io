// UI.js — 卡片建立、預覽渲染、按鈕狀態與顯示區塊切換
// 依賴：State.js（需先載入）、File.js 的 downloadImage

/* ── 建立上傳卡片 DOM（返回 article element）── */
function UI_createImageCard(filename, imageSrc) {
    const imageContainer = document.createElement("article");
    imageContainer.classList.add("image-container");
    imageContainer.dataset.filename = filename;

    const imageHeader = document.createElement("header");
    imageHeader.classList.add("image-container-header");

    const imageTitle = document.createElement("span");
    imageTitle.classList.add("image-container-title");
    imageTitle.textContent = filename.replace(/\.[^/.]+$/, "");

    imageHeader.appendChild(imageTitle);
    imageContainer.appendChild(imageHeader);

    const imgWrapper = document.createElement("div");
    imgWrapper.classList.add("image-preview");

    const img = document.createElement("img");
    img.src = imageSrc;
    img.alt = filename;
    img.draggable = false;

    imgWrapper.appendChild(img);
    imageContainer.appendChild(imgWrapper);

    return imageContainer;
}

/* ── 上傳狀態與預覽控制 ── */
function UI_updateProcessButton() {
    const total = imagesContainer.querySelectorAll(".image-container").length;
    if (total === 0) previewSection.hidden = true;

    if (total >= 10) {
        uploadArea.classList.add("hidden");
    } else {
        uploadArea.classList.remove("hidden");
    }
}

/* ── 只在處理完成後才顯示預覽 ── */
function UI_showPreviewOnlyAfterProcess() {
    previewSection.hidden = true;
}

/* ── 預覽渲染 ── */
function UI_displayPreview() {
    previewContainer.innerHTML = "";

    editedImages.forEach((image, index) => {
        const imgWrapper = document.createElement("article");
        imgWrapper.className = "preview-item";

        const imageHeader = document.createElement("header");
        imageHeader.className = "preview-item-header";

        const imageTitle = document.createElement("span");
        imageTitle.className = "preview-item-title";
        imageTitle.textContent = image.originalFilename || image.filename;
        imageHeader.appendChild(imageTitle);

        const img = document.createElement("img");
        img.src = image.dataURL;
        img.alt = `已加浮水印的照片 ${index + 1}`;
        img.draggable = false;

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = "secondary download-single-button";
        downloadBtn.innerHTML = "下載";
        downloadBtn.setAttribute("aria-label", `下載照片 ${index + 1}`);
        downloadBtn.addEventListener("click", () => downloadImage(image.dataURL, image.filename));

        const actions = document.createElement("footer");
        actions.className = "action-row";
        actions.appendChild(downloadBtn);

        imgWrapper.appendChild(imageHeader);
        imgWrapper.appendChild(img);
        imgWrapper.appendChild(actions);
        previewContainer.appendChild(imgWrapper);
    });

    previewSection.hidden = false;
    previewSection.scrollIntoView({ behavior: "smooth" });
}
