// UI.js — 卡片建立、預覽渲染、按鈕狀態與顯示區塊切換
// 依賴：State.js（需先載入）、File.js 的 downloadImage

/* ── 建立上傳卡片 DOM（返回 article element）── */
function UI_createImageCard(filename, imageSrc) {
    const imageContainer = document.createElement("article");
    imageContainer.classList.add("image-container");
    imageContainer.dataset.filename = filename;

    // Header
    const imageHeader = document.createElement("header");
    imageHeader.classList.add("image-container-header");

    const imageTitle = document.createElement("span");
    imageTitle.classList.add("image-container-title");
    imageTitle.textContent = filename;

    const cancelBtn = document.createElement("button");
    cancelBtn.classList.add("cancel-button");
    cancelBtn.type = "button";
    cancelBtn.textContent = "取消";
    cancelBtn.setAttribute("aria-label", "取消此照片");

    imageHeader.appendChild(imageTitle);
    imageHeader.appendChild(cancelBtn);
    imageContainer.appendChild(imageHeader);

    // Cropper wrapper
    const imgWrapper = document.createElement("article");
    imgWrapper.classList.add("image-cropper");

    const img = document.createElement("img");
    img.src = imageSrc;
    img.alt = filename;
    img.draggable = false;

    imgWrapper.appendChild(img);
    imageContainer.appendChild(imgWrapper);

    // Ratio controls
    const controls = document.createElement("div");
    controls.classList.add("controls");
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "裁剪比例");

    const ratios = [
        { label: "16:9", ratio: "16:9", ariaLabel: "16:9 比例裁剪", current: false },
        { label: "4:5", ratio: "4:5", ariaLabel: "4:5 比例裁剪", current: false },
    ];

    ratios.forEach(({ label, ratio, ariaLabel, current }) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.dataset.ratio = ratio;
        btn.setAttribute("aria-label", ariaLabel);
        if (current) btn.setAttribute("aria-current", "true");
        controls.appendChild(btn);
    });

    imageContainer.appendChild(controls);
    return imageContainer;
}

/* ── 處理按鈕可見性 ── */
function UI_updateProcessButton() {
    const total = imagesContainer.querySelectorAll(".image-container").length;
    processBtn.hidden = total === 0;
    if (total === 0) previewSection.hidden = true;

    if (total >= 4) {
        uploadArea.classList.add("hidden");
    } else {
        uploadArea.classList.remove("hidden");
    }
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
        imageTitle.textContent = image.filename;
        imageHeader.appendChild(imageTitle);

        const img = document.createElement("img");
        img.src = image.dataURL;
        img.alt = `編輯後的照片 ${index + 1}`;
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
