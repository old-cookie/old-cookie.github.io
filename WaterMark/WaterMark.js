// @charset "utf-8";

/**
 * WaterMark 照片編輯和水印處理腳本
 * 版本: 3.0.0
 * 描述: 提供照片上傳、編輯、添加水印及下載功能
 * 作者: OldCookie
 * 建立日期: 2025年
 * 
 * 依賴項:
 * - Cropper.js v1.6.2 (提供圖片裁剪功能)
 * 
 * 主要功能:
 * - 拖放式照片上傳
 * - 支持多張照片處理 (最多4張)
 * - 圖片裁剪 (自由比例、16:9、3:4)
 * - AI 圖像放大增強
 * - 自動添加水印
 * - 批量下載處理後的圖片
 */

// 全局變量
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const imagesContainer = document.getElementById('imagesContainer');
const previewSection = document.getElementById('previewSection');
const previewContainer = document.getElementById('previewContainer');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const processBtn = document.getElementById('processBtn');

// AI 放大相關變數
const aiUpscaleOptions = document.getElementById('aiUpscaleOptions');
const enableUpscale = document.getElementById('enableUpscale');
const upscaleFactor = document.getElementById('upscaleFactor');

let cropperInstances = [];
let editedImages = [];

// 啟用/禁用放大倍率選擇
enableUpscale.addEventListener('change', function () {
    upscaleFactor.disabled = !this.checked;
});

// 處理拖曳
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (uploadArea.classList.contains('hidden')) return;
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    if (uploadArea.classList.contains('hidden')) return;
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    handleFiles(files);
});

// 處理點擊上傳
uploadArea.addEventListener('click', () => {
    if (uploadArea.classList.contains('hidden')) return;
    fileInput.click();
});

// 處理文件選擇
fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    handleFiles(files);
    fileInput.value = ''; // 重設文件輸入
});

// 處理上傳的文件
function handleFiles(files) {
    const existingFiles = imagesContainer.querySelectorAll('.image-container').length;
    const totalFiles = existingFiles + files.length;
    if (totalFiles > 4) {
        alert('您最多可以上傳4張照片。');
        return;
    }

    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const imageContainer = document.createElement('div');
            imageContainer.classList.add('image-container');

            // 取消按鈕（位於裁剪區域上方）
            const cancelBtn = document.createElement('button');
            cancelBtn.classList.add('cancel-button');
            cancelBtn.textContent = '取消';
            imageContainer.appendChild(cancelBtn);

            const imgWrapper = document.createElement('div');
            imgWrapper.classList.add('cropper-wrapper');

            const img = document.createElement('img');
            img.src = event.target.result;
            img.alt = file.name;

            imgWrapper.appendChild(img);
            imageContainer.appendChild(imgWrapper);

            // 裁剪比例控制
            const controls = document.createElement('div');
            controls.classList.add('controls');

            // 裁剪比例按鈕
            const aspectFree = document.createElement('button');
            aspectFree.classList.add('aspect-btn');
            aspectFree.textContent = '自由';
            aspectFree.dataset.ratio = 'NaN';

            const aspect169 = document.createElement('button');
            aspect169.classList.add('aspect-btn');
            aspect169.textContent = '16:9';
            aspect169.dataset.ratio = '16/9';

            const aspect34 = document.createElement('button');
            aspect34.classList.add('aspect-btn');
            aspect34.textContent = '3:4';
            aspect34.dataset.ratio = '3/4';

            controls.appendChild(aspectFree);
            controls.appendChild(aspect169);
            controls.appendChild(aspect34);

            imageContainer.appendChild(controls);
            imagesContainer.appendChild(imageContainer);

            // 初始化 Cropper
            const cropper = new Cropper(img, {
                viewMode: 1,
                movable: true,
                zoomable: true,
                scalable: true,
                aspectRatio: 16 / 9, // 默認為16:9
                autoCropArea: 1,
                responsive: true,
                background: false,
                modal: true,
            });

            cropperInstances.push(cropper);

            // 設置默認活躍的裁剪比例按鈕
            aspect169.classList.add('active');

            // 裁剪比例按鈕點擊事件
            [aspectFree, aspect169, aspect34].forEach(button => {
                button.addEventListener('click', () => {
                    // 移除所有按鈕的 'active' 類
                    [aspectFree, aspect169, aspect34].forEach(btn => btn.classList.remove('active'));
                    // 為被點擊的按鈕添加 'active' 類
                    button.classList.add('active');
                    // 設置相應的裁剪比例
                    const ratio = button.dataset.ratio;
                    if (ratio === 'NaN') {
                        cropper.setAspectRatio(NaN);
                    } else {
                        cropper.setAspectRatio(eval(ratio));
                    }
                });
            });

            // 取消按鈕行為
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isSure = cancelBtn.classList.contains('sure');

                if (!isSure) {
                    // 改變按鈕文字為 "確定？"
                    cancelBtn.textContent = '確定？';
                    cancelBtn.classList.add('sure');

                    // 監聽頁面上的點擊事件以重置按鈕
                    document.addEventListener('click', resetCancelButtons);
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
    const activeSureButtons = document.querySelectorAll('.cancel-button.sure');
    activeSureButtons.forEach(button => {
        button.textContent = '取消';
        button.classList.remove('sure');
    });
    document.removeEventListener('click', resetCancelButtons);
}

// 函數：移除照片
function removePhoto(imageContainer, cropper) {
    // 銷毀 Cropper 實例
    cropper.destroy();
    const index = cropperInstances.indexOf(cropper);
    if (index > -1) {
        cropperInstances.splice(index, 1);
    }
    // 從 DOM 中移除圖片容器
    imageContainer.remove();
    // 更新 "處理圖片" 按鈕的顯示狀態
    updateProcessButtonVisibility();
    // 如果照片數少於4，重新顯示上傳區域
    if (imagesContainer.querySelectorAll('.image-container').length < 4) {
        uploadArea.classList.remove('hidden');
    }
}

// 函數：添加水印並準備預覽
function processImages() {
    editedImages = [];
    const isUpscalingEnabled = enableUpscale.checked;
    const scaleFactor = isUpscalingEnabled ? parseFloat(upscaleFactor.value) : 1;

    // 更新處理按鈕狀態
    processBtn.disabled = true;
    processBtn.textContent = isUpscalingEnabled ? 'AI 處理中...' : '處理中...';

    const promises = cropperInstances.map((cropper, index) => {
        return new Promise(async (resolve) => {
            const canvas = cropper.getCroppedCanvas({
                imageSmoothingQuality: 'high',
            });

            // 獲取裁剪後的圖像數據
            let imageData = canvas.toDataURL('image/png');

            // 如果啟用了 AI 放大
            if (isUpscalingEnabled) {
                imageData = await upscaleImage(imageData, scaleFactor);
            }

            // 創建新圖像以添加水印
            const img = new Image();
            img.src = imageData;

            img.onload = () => {
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = img.width;
                finalCanvas.height = img.height;

                const ctx = finalCanvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const watermark = new Image();
                watermark.src = "assets/Cherryneko_Watermark_WithNameXUsername.svg";

                watermark.onload = () => {
                    // 計算水印大小（圖片寬度的1/5）
                    const wmWidth = finalCanvas.width / 5;
                    const wmHeight = (watermark.height / watermark.width) * wmWidth;

                    // 水印位置設置為右下角，10px 從邊緣
                    ctx.drawImage(watermark,
                        finalCanvas.width - wmWidth - 10,
                        finalCanvas.height - wmHeight - 10,
                        wmWidth, wmHeight);

                    const dataURL = finalCanvas.toDataURL('image/png');
                    editedImages.push(dataURL);
                    resolve();
                };

                watermark.onerror = () => {
                    alert('無法載入水印圖片。請確保水印文件存在。');
                    // 即使水印無法載入，也使用未添加水印的圖像
                    const dataURL = finalCanvas.toDataURL('image/png');
                    editedImages.push(dataURL);
                    resolve();
                };
            };

            img.onerror = () => {
                alert('處理圖像時出錯。');
                resolve();
            };
        });
    });

    Promise.all(promises).then(() => {
        displayPreview();
        // 恢復按鈕狀態
        processBtn.disabled = false;
        processBtn.textContent = '處理圖片';
    });
}

// AI 圖像放大函數
async function upscaleImage(imageDataUrl, scale) {
    try {
        // 創建一個新的 Image 對象來獲取圖像尺寸
        const img = new Image();
        img.src = imageDataUrl;

        // 等待圖像載入
        await new Promise(resolve => {
            img.onload = resolve;
        });

        // 創建一個新的 Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // 設置新的尺寸
        const newWidth = Math.round(img.width * scale);
        const newHeight = Math.round(img.height * scale);

        canvas.width = newWidth;
        canvas.height = newHeight;

        // 使用高質量的縮放
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 實現基本的雙線性插值放大
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // 使用簡單的銳化濾鏡增強細節
        if (scale > 1) {
            const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
            const data = imageData.data;

            // 先備份原始資料
            const original = new Uint8ClampedArray(data);

            // 銳化強度 (0.1 到 0.3 是合理範圍)
            const sharpenIntensity = 0.2;

            // 對圖像應用簡單銳化濾鏡 (避免處理邊緣像素)
            for (let y = 1; y < newHeight - 1; y++) {
                for (let x = 1; x < newWidth - 1; x++) {
                    const idx = (y * newWidth + x) * 4;

                    // 對每個顏色通道應用銳化
                    for (let c = 0; c < 3; c++) { // RGB 通道
                        const current = original[idx + c];

                        // 檢查周圍像素來銳化
                        const top = original[((y - 1) * newWidth + x) * 4 + c];
                        const bottom = original[((y + 1) * newWidth + x) * 4 + c];
                        const left = original[(y * newWidth + (x - 1)) * 4 + c];
                        const right = original[(y * newWidth + (x + 1)) * 4 + c];

                        // 基本拉普拉斯銳化算法
                        const sharpened = 5 * current - top - bottom - left - right;

                        // 將銳化值與原始值混合
                        data[idx + c] = Math.min(255, Math.max(0,
                            current * (1 - sharpenIntensity) + sharpened * sharpenIntensity));
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
        }

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('圖像放大錯誤:', error);
        return imageDataUrl; // 如果出錯，返回原始圖像
    }
}

// 函數：顯示預覽
function displayPreview() {
    previewContainer.innerHTML = '';
    editedImages.forEach((dataURL, index) => {
        const img = document.createElement('img');
        img.src = dataURL;
        img.alt = `編輯後的照片 ${index + 1}`;
        previewContainer.appendChild(img);
    });
    previewSection.style.display = 'block';
    // 滾動到預覽區域
    previewSection.scrollIntoView({ behavior: 'smooth' });
}

// 函數：下載所有圖片
downloadAllBtn.addEventListener('click', () => {
    downloadAllImages();
});

function downloadAllImages() {
    editedImages.forEach((dataURL, index) => {
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `edited_image_${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// 處理 "處理圖片" 按鈕點擊
processBtn.addEventListener('click', () => {
    if (cropperInstances.length === 0) {
        alert('請先上傳並配置照片。');
        return;
    }
    processBtn.disabled = true;
    processBtn.textContent = '處理中...';
    processImages();
    // 在處理完成後重新啟用按鈕（延遲1秒模擬處理時間）
    setTimeout(() => {
        processBtn.disabled = false;
        processBtn.textContent = '處理圖片';
    }, 1000);
});

// 函數：更新 "處理圖片" 按鈕和上傳區域的顯示狀態
function updateProcessButtonVisibility() {
    const totalImages = imagesContainer.querySelectorAll('.image-container').length;
    if (totalImages > 0) {
        processBtn.style.display = 'block';
        aiUpscaleOptions.style.display = 'block'; // 顯示 AI 放大選項
    } else {
        processBtn.style.display = 'none';
        aiUpscaleOptions.style.display = 'none'; // 隱藏 AI 放大選項
        // 隱藏預覽區域
        previewSection.style.display = 'none';
    }

    if (totalImages >= 4) {
        uploadArea.classList.add('hidden'); // 隱藏上傳區域
    } else {
        uploadArea.classList.remove('hidden'); // 顯示上傳區域
    }
}
