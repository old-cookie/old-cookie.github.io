// Cropper.js — Cropper v2 建立、比例切換、裁切同步、邊界限制與 ResizeObserver
// 依賴：State.js（需先載入）

/* ── CropperV2 constructor 解析 ── */
function resolveCropperConstructor() {
    const C = window.Cropper;
    if (typeof C === "function") return C;
    if (typeof C?.default === "function") return C.default;
    return null;
}

/* ── 幾何輔助 ── */
function getCropperImageBounds(cropper) {
    const cropperCanvas = cropper.getCropperCanvas?.();
    const cropperImage = cropper.getCropperImage?.();
    if (!cropperCanvas || !cropperImage) return null;

    const canvasRect = cropperCanvas.getBoundingClientRect();
    const imageRect = cropperImage.getBoundingClientRect();
    if (!canvasRect.width || !canvasRect.height || !imageRect.width || !imageRect.height) return null;

    return {
        x: imageRect.left - canvasRect.left,
        y: imageRect.top - canvasRect.top,
        width: imageRect.width,
        height: imageRect.height,
    };
}

function getSelectionRectForAspectRatio(imageBounds, ratio) {
    if (!imageBounds) return null;
    if (!Number.isFinite(ratio) || ratio <= 0) return imageBounds;

    const boundsRatio = imageBounds.width / imageBounds.height;
    let width, height;
    if (boundsRatio > ratio) {
        height = imageBounds.height;
        width = height * ratio;
    } else {
        width = imageBounds.width;
        height = width / ratio;
    }
    return {
        x: imageBounds.x + (imageBounds.width - width) / 2,
        y: imageBounds.y + (imageBounds.height - height) / 2,
        width,
        height,
    };
}

/* ── Layout helpers ── */
function refreshCropperLayout(cropper) {
    if (!cropper) return;
    const selection = cropper.getCropperSelection?.();
    if (selection && typeof selection.$render === "function") selection.$render();
}

function keepImageInsideCanvas(cropper) {
    if (!cropper) return;
    const cropperImage = cropper.getCropperImage?.();
    if (cropperImage && typeof cropperImage.$center === "function") cropperImage.$center("contain");
}

function fitImageToContainer(cropper) {
    if (!cropper) return;
    keepImageInsideCanvas(cropper);
    const selection = cropper.getCropperSelection?.();
    if (selection && typeof selection.$render === "function") selection.$render();
}

/* ── 比例設定 ── */
function setCropperAspectRatio(cropper, ratio) {
    const selection = cropper.getCropperSelection?.();
    if (selection) selection.aspectRatio = ratio;
}

function syncSelectionToAspectRatio(cropper, ratio) {
    const selection = cropper.getCropperSelection?.();
    const imageBounds = getCropperImageBounds(cropper);
    if (!selection || !imageBounds || typeof selection.$change !== "function") return;

    const nextRect = getSelectionRectForAspectRatio(imageBounds, ratio);
    if (!nextRect) return;

    selection.$change(nextRect.x, nextRect.y, nextRect.width, nextRect.height, ratio);
}

/* ── 邊界限制 ── */
function limitSelectionToCanvas(event) {
    if (suppressSelectionBoundaryCheck) return;

    const selection = event.currentTarget;
    const cropper = cropperInstances.find((inst) => inst.getCropperSelection?.() === selection);
    if (!cropper) return;

    const imageBounds = getCropperImageBounds(cropper);
    if (!imageBounds) return;

    const { x, y, width, height } = event.detail || {};
    const maxWidth = Math.min(width, imageBounds.width);
    const maxHeight = Math.min(height, imageBounds.height);
    const maxX = imageBounds.x + imageBounds.width - maxWidth;
    const maxY = imageBounds.y + imageBounds.height - maxHeight;
    const nextX = Math.min(Math.max(x, imageBounds.x), maxX);
    const nextY = Math.min(Math.max(y, imageBounds.y), maxY);

    if (nextX !== x || nextY !== y || maxWidth !== width || maxHeight !== height) {
        event.preventDefault();
        suppressSelectionBoundaryCheck = true;
        selection.$change(nextX, nextY, maxWidth, maxHeight, selection.aspectRatio);
        requestAnimationFrame(() => { suppressSelectionBoundaryCheck = false; });
    }
}

/* ── 取得裁切畫布 ── */
async function getCroppedCanvasFromInstance(cropper) {
    const selection = cropper.getCropperSelection?.();
    if (selection && typeof selection.$toCanvas === "function") {
        return selection.$toCanvas({
            beforeDraw(context) { context.imageSmoothingQuality = "high"; },
        });
    }
    return null;
}

/* ── ResizeObserver ── */
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

window.addEventListener("resize", () => {
    cropperInstances.forEach((cropper) => {
        refreshCropperLayout(cropper);
        setTimeout(() => fitImageToContainer(cropper), 0);
    });
});

/* ── 公開：初始化單一裁切器 ── */
function Cropper_init(imgEl, imgWrapper, ratioButtons, imageContainer) {
    const CropperClass = resolveCropperConstructor();
    if (!CropperClass) {
        console.error("Cropper.js 載入失敗：找不到可用的 Cropper constructor。");
        alert("Cropper.js 載入失敗，請重新整理頁面後再試。");
        imageContainer.remove();
        return;
    }

    let cropper;
    try {
        cropper = new CropperClass(imgEl, {
            container: imgWrapper,
            template: `
<cropper-canvas background>
  <cropper-image skewable translatable></cropper-image>
  <cropper-shade hidden></cropper-shade>
  <cropper-handle action="select" plain></cropper-handle>
  <cropper-selection initial-coverage="0.5" movable resizable>
    <cropper-grid role="grid" bordered covered></cropper-grid>
    <cropper-crosshair centered></cropper-crosshair>
    <cropper-handle action="move" theme-color="rgba(255,255,255,0.35)"></cropper-handle>
    <cropper-handle action="n-resize"></cropper-handle>
    <cropper-handle action="e-resize"></cropper-handle>
    <cropper-handle action="s-resize"></cropper-handle>
    <cropper-handle action="w-resize"></cropper-handle>
    <cropper-handle action="ne-resize"></cropper-handle>
    <cropper-handle action="nw-resize"></cropper-handle>
    <cropper-handle action="se-resize"></cropper-handle>
    <cropper-handle action="sw-resize"></cropper-handle>
  </cropper-selection>
</cropper-canvas>`,
        });
    } catch (error) {
        console.error("建立 Cropper 實例失敗：", error);
        alert("建立裁剪器失敗，請重新整理頁面後再試。");
        imageContainer.remove();
        return;
    }

    const cropperImage = cropper.getCropperImage?.();
    const cropperSelection = cropper.getCropperSelection?.();

    if (cropperSelection) {
        cropperSelection.initialAspectRatio = 16 / 9;
        cropperSelection.aspectRatio = 16 / 9;
        cropperSelection.addEventListener("change", limitSelectionToCanvas);
    }

    if (cropperImage && typeof cropperImage.$ready === "function") {
        cropperImage.$ready().then(() => {
            fitImageToContainer(cropper);
            cropperSelection?.$render?.();
        });
    } else {
        requestAnimationFrame(() => fitImageToContainer(cropper));
    }

    cropperInstances.push(cropper);
    cropperMap.set(imgWrapper, cropper);

    initResizeObserver();
    resizeObserver.observe(imgWrapper);

    // 比例按鈕事件
    const [btnFree, btn169, btn45] = ratioButtons;
    btn169.classList.add("active");

    ratioButtons.forEach((button) => {
        button.addEventListener("click", () => {
            ratioButtons.forEach((b) => b.removeAttribute("aria-current"));
            button.setAttribute("aria-current", "true");

            const ratio = button.dataset.ratio;
            if (ratio === "free") {
                setCropperAspectRatio(cropper, NaN);
            } else if (ratio === "16:9") {
                setCropperAspectRatio(cropper, 16 / 9);
            } else {
                setCropperAspectRatio(cropper, 4 / 5);
            }

            syncSelectionToAspectRatio(cropper, ratio === "free" ? NaN : Number.parseFloat(ratio));
            setTimeout(() => fitImageToContainer(cropper), 0);
        });
    });

    // 取消按鈕事件（需 File.js 的 removePhoto / resetCancelButtons）
    const cancelBtn = imageContainer.querySelector(".cancel-button");
    cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!cancelBtn.classList.contains("sure")) {
            cancelBtn.textContent = "確定？";
            cancelBtn.classList.add("sure");
            document.addEventListener("click", resetCancelButtons);
        } else {
            removePhoto(imageContainer, cropper);
        }
    });
}
