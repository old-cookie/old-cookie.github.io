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
const cropperFrameRatioMap = new WeakMap();
const cropperSelectionStateMap = new WeakMap();

function getCropperCanvasRect(cropper) {
    const cropperCanvas = cropper?.getCropperCanvas?.();
    if (!cropperCanvas) return null;

    const rect = cropperCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return rect;
}

function captureSelectionState(cropper) {
    if (!cropper) return;

    const selection = cropper.getCropperSelection?.();
    const canvasRect = getCropperCanvasRect(cropper);
    if (!selection || !canvasRect) return;

    const x = Number(selection.getAttribute("x"));
    const y = Number(selection.getAttribute("y"));
    const width = Number(selection.getAttribute("width"));
    const height = Number(selection.getAttribute("height"));
    if (![x, y, width, height].every(Number.isFinite)) return;

    cropperSelectionStateMap.set(cropper, {
        x,
        y,
        width,
        height,
        canvasWidth: canvasRect.width,
        canvasHeight: canvasRect.height,
        ratio: cropperFrameRatioMap.get(cropper),
    });
}

function restoreSelectionState(cropper) {
    if (!cropper) return;

    const selection = cropper.getCropperSelection?.();
    const canvasRect = getCropperCanvasRect(cropper);
    const state = cropperSelectionStateMap.get(cropper);
    if (!selection || !canvasRect || !state) return;

    const scaleX = canvasRect.width / state.canvasWidth;
    const scaleY = canvasRect.height / state.canvasHeight;
    const scale = Number.isFinite(scaleX) && Number.isFinite(scaleY)
        ? Math.min(scaleX, scaleY)
        : 1;

    const nextX = state.x * scale;
    const nextY = state.y * scale;
    const nextWidth = state.width * scale;
    const nextHeight = state.height * scale;
    const ratio = Number(state.ratio);
    const resolvedRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;

    suppressSelectionBoundaryCheck = true;
    selection.$change(nextX, nextY, nextWidth, nextHeight, resolvedRatio);
    selection.$render?.();
    captureSelectionState(cropper);
    requestAnimationFrame(() => { suppressSelectionBoundaryCheck = false; });
}

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
    const selection = cropper.getCropperSelection?.();
    if (selection && typeof selection.$render === "function") selection.$render();
}

function centerCropperImageOnce(cropper) {
    if (!cropper) return;
    keepImageInsideCanvas(cropper);
}

function getImageAspectRatio(cropper) {
    const imageBounds = getCropperImageBounds(cropper);
    if (!imageBounds || !imageBounds.height) return NaN;
    return imageBounds.width / imageBounds.height;
}

function setCropperFrameRatio(imgWrapper, ratio) {
    if (!imgWrapper) return;
    imgWrapper.style.setProperty("--cropper-aspect-ratio", String(ratio));
}

function setActiveRatioButton(ratioButtons, ratioValue) {
    ratioButtons.forEach((button) => button.removeAttribute("aria-current"));
    const target = ratioValue === 4 / 5 ? ratioButtons[1] : ratioButtons[0];
    target?.setAttribute("aria-current", "true");
}

/* ── 比例設定 ── */
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
                restoreSelectionState(cropper);
            }
        });
    });
}

let cropperLayoutSyncFrame = null;

function syncCropperLayoutOnViewportChange() {
    if (cropperLayoutSyncFrame !== null) return;
    cropperLayoutSyncFrame = requestAnimationFrame(() => {
        cropperLayoutSyncFrame = null;
        cropperInstances.forEach((cropper) => {
            refreshCropperLayout(cropper);
            fitImageToContainer(cropper);
            restoreSelectionState(cropper);
        });
    });
}

window.addEventListener("resize", syncCropperLayoutOnViewportChange);

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
    <cropper-image rotatable scalable skewable translatable></cropper-image>
  <cropper-shade hidden></cropper-shade>
        <cropper-handle action="move" plain theme-color="rgba(0,0,0,0.35)"></cropper-handle>
    <cropper-selection initial-coverage="1" style="pointer-events: none;"></cropper-selection>
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
    let defaultFrameRatio = 16 / 9;
    setCropperFrameRatio(imgWrapper, defaultFrameRatio);
    cropperFrameRatioMap.set(cropper, defaultFrameRatio);

    if (cropperImage && typeof cropperImage.$ready === "function") {
        cropperImage.$ready().then(() => {
            const imageRatio = getImageAspectRatio(cropper);
            const defaultFrameRatio = imageRatio > 0 && imageRatio < 1 ? 4 / 5 : 16 / 9;
            setCropperFrameRatio(imgWrapper, defaultFrameRatio);
            cropperFrameRatioMap.set(cropper, defaultFrameRatio);
            centerCropperImageOnce(cropper);
            fitImageToContainer(cropper);
            cropperSelection?.$render?.();
            captureSelectionState(cropper);
            setActiveRatioButton(ratioButtons, defaultFrameRatio);
        });
    } else {
        requestAnimationFrame(() => {
            centerCropperImageOnce(cropper);
            fitImageToContainer(cropper);
            captureSelectionState(cropper);
        });
    }

    cropperInstances.push(cropper);
    cropperMap.set(imgWrapper, cropper);

    initResizeObserver();
    resizeObserver.observe(imgWrapper);

    // 比例按鈕事件
    const [btn169, btn45] = ratioButtons;
    setActiveRatioButton(ratioButtons, defaultFrameRatio);

    ratioButtons.forEach((button) => {
        button.addEventListener("click", () => {
            ratioButtons.forEach((b) => b.removeAttribute("aria-current"));
            button.setAttribute("aria-current", "true");
            const ratio = button.dataset.ratio === "4:5" ? 4 / 5 : 16 / 9;
            setCropperFrameRatio(imgWrapper, ratio);
            cropperFrameRatioMap.set(cropper, ratio);
            setActiveRatioButton(ratioButtons, ratio);
            centerCropperImageOnce(cropper);
            setTimeout(() => fitImageToContainer(cropper), 0);
            setTimeout(() => captureSelectionState(cropper), 0);
        });
    });

    cropperSelection?.addEventListener?.("change", () => {
        requestAnimationFrame(() => captureSelectionState(cropper));
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
