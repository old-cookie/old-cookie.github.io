(function () {
    const fileInput = document.getElementById("fileInput");
    const uploadArea = document.getElementById("uploadArea");
    const fileStatus = document.getElementById("fileStatus");
    const clearBtn = document.getElementById("clearBtn");
    const cropShell = document.getElementById("cropShell");
    const cropFrame = cropShell.querySelector(".crop-frame");
    const cropperHost = document.getElementById("cropperHost");
    const downloadBtn = document.getElementById("downloadBtn");

    const OUTPUT_SIZE = 3000;
    let cropper = null;
    let currentObjectUrl = null;
    let currentFileName = "avatar.png";
    let exportDataUrl = "";
    let isProcessing = false;
    let resizeObserver = null;
    let resizeFrameId = null;

    function resolveCropperConstructor() {
        const C = window.Cropper;
        if (typeof C === "function") return C;
        if (typeof C?.default === "function") return C.default;
        return null;
    }

    function revokeCurrentObjectUrl() {
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
    }

    function resetPreviewState() {
        exportDataUrl = "";
        downloadBtn.disabled = true;
        downloadBtn.hidden = true;
        uploadArea.hidden = false;
    }

    function destroyCropper() {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        resizeObserver = null;

        if (cropper && typeof cropper.destroy === "function") {
            cropper.destroy();
        }
        cropper = null;
        cropperHost.innerHTML = "";
        cropShell.hidden = true;
    }

    function updateStatus(message, hasFile = false) {
        fileStatus.textContent = message;
        clearBtn.hidden = !hasFile;
        uploadArea.classList.toggle("is-locked", hasFile);
    }

    function getSafeFilename(sourceName) {
        const baseName = sourceName.replace(/\.[^.]+$/, "").trim() || "avatar";
        return `${baseName}_3000.png`;
    }

    function createCropperInstance(imageElement) {
        const CropperClass = resolveCropperConstructor();
        if (!CropperClass) {
            throw new Error("找不到可用的 Cropper.js constructor。");
        }

        cropper = new CropperClass(imageElement, {
            container: cropperHost,
            template: `
        <cropper-canvas background>
          <cropper-image rotatable scalable skewable translatable></cropper-image>
          <cropper-shade hidden></cropper-shade>
          <cropper-selection initial-coverage="1" aspect-ratio="1" movable resizable zoomable outlined>
            <cropper-grid role="grid" bordered covered></cropper-grid>
          </cropper-selection>
          <cropper-handle action="move" plain theme-color="rgba(40, 75, 99, 0.45)"></cropper-handle>
        </cropper-canvas>
      `,
        });

        const cropperImage = cropper.getCropperImage?.();
        if (cropperImage && typeof cropperImage.$ready === "function") {
            cropperImage.$ready().then(() => {
                cropperImage.$center?.("contain");
                cropper.getCropperSelection?.()?.$render?.();
            });
        }
    }

    function syncCropperLayout() {
        if (!cropper) return;
        cropper.getCropperCanvas?.()?.$render?.();
        cropper.getCropperImage?.()?.$center?.("contain");
        cropper.getCropperSelection?.()?.$render?.();
    }

    function scheduleCropperLayoutSync() {
        if (resizeFrameId !== null) return;
        resizeFrameId = window.requestAnimationFrame(() => {
            resizeFrameId = null;
            syncCropperLayout();
        });
    }

    function initResizeObserver() {
        if (resizeObserver || !cropFrame) return;
        resizeObserver = new ResizeObserver(() => {
            scheduleCropperLayoutSync();
        });
        resizeObserver.observe(cropFrame);
    }

    async function renderExport() {
        if (!cropper) {
            throw new Error("請先上傳照片。");
        }

        const selection = cropper.getCropperSelection?.();
        if (!selection || typeof selection.$toCanvas !== "function") {
            throw new Error("無法取得裁切區域，請重新整理後再試。");
        }

        const sourceCanvas = await selection.$toCanvas({
            width: OUTPUT_SIZE,
            height: OUTPUT_SIZE,
            beforeDraw(context) {
                context.imageSmoothingEnabled = true;
                context.imageSmoothingQuality = "high";
            },
        });

        if (!sourceCanvas) {
            throw new Error("輸出畫布建立失敗。");
        }

        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = OUTPUT_SIZE;
        exportCanvas.height = OUTPUT_SIZE;
        const context = exportCanvas.getContext("2d");

        if (!context) {
            throw new Error("無法建立 2D 繪圖環境。");
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        context.drawImage(sourceCanvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

        return exportCanvas.toDataURL("image/png");
    }

    function downloadDataUrl(dataUrl, filename) {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async function processImage() {
        if (isProcessing) return;
        isProcessing = true;
        downloadBtn.textContent = "處理中...";
        downloadBtn.disabled = true;

        try {
            exportDataUrl = await renderExport();
            downloadBtn.disabled = false;
            updateStatus(`已產生 ${currentFileName}，可直接下載。`, true);
        } catch (error) {
            console.error(error);
            alert(error.message || "處理失敗。");
            resetPreviewState();
        } finally {
            isProcessing = false;
            downloadBtn.textContent = "下載 PNG";
            downloadBtn.disabled = !cropper;
        }
    }

    function handleFile(file) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("請選擇圖片檔案。");
            return;
        }

        revokeCurrentObjectUrl();
        destroyCropper();
        resetPreviewState();

        currentFileName = getSafeFilename(file.name);
        currentObjectUrl = URL.createObjectURL(file);

        const image = new Image();
        image.alt = file.name;
        image.src = currentObjectUrl;
        image.draggable = false;

        image.onload = () => {
            cropperHost.innerHTML = "";
            cropperHost.appendChild(image);
            try {
                createCropperInstance(image);
                cropShell.hidden = false;
                initResizeObserver();
                scheduleCropperLayoutSync();
                updateStatus(`已載入 ${file.name}。請拖曳圖片並按下處理。`, true);
                uploadArea.hidden = true;
                downloadBtn.hidden = false;
                downloadBtn.disabled = false;
                clearBtn.hidden = false;
            } catch (error) {
                console.error(error);
                alert(error.message || "建立裁切器失敗。");
                destroyCropper();
                revokeCurrentObjectUrl();
                updateStatus("尚未上傳照片。", false);
            }
        };

        image.onerror = () => {
            alert("圖片載入失敗，請換一張試試。");
            revokeCurrentObjectUrl();
            updateStatus("尚未上傳照片。", false);
        };
    }

    fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        handleFile(file);
    });

    clearBtn.addEventListener("click", () => {
        fileInput.value = "";
        revokeCurrentObjectUrl();
        destroyCropper();
        currentFileName = "avatar.png";
        updateStatus("尚未上傳照片。", false);
        resetPreviewState();
    });

    downloadBtn.addEventListener("click", async () => {
        await processImage();
        if (!exportDataUrl) {
            return;
        }
        downloadDataUrl(exportDataUrl, currentFileName);
    });

    window.addEventListener("resize", scheduleCropperLayoutSync);

    window.addEventListener("beforeunload", () => {
        revokeCurrentObjectUrl();
    });

    updateStatus("尚未上傳照片。", false);
    resetPreviewState();
})();