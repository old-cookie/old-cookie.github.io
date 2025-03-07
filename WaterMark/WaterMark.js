/**
 * WaterMark 照片編輯和水印處理腳本
 * 版本: 1.0.0
 * 描述: 提供照片上傳、編輯、添加水印及下載功能
 * 作者: OldCookie
 * 建立日期: 2023年
 * 
 * 依賴項:
 * - Cropper.js v1.6.2 (提供圖片裁剪功能)
 * 
 * 主要功能:
 * - 拖放式照片上傳
 * - 支持多張照片處理 (最多4張)
 * - 圖片裁剪 (自由比例、16:9、3:4)
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

let cropperInstances = [];
let editedImages = [];

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
    const promises = cropperInstances.map((cropper, index) => {
        return new Promise((resolve) => {
            const canvas = cropper.getCroppedCanvas({
                imageSmoothingQuality: 'high',
            });

            const ctx = canvas.getContext('2d');

            const watermark = new Image();
            watermark.src = "assets/Cherryneko_Watermark_WithNameXUsername.svg";
            watermark.onload = () => {
                // 計算水印大小（圖片寬度的1/5）
                const wmWidth = canvas.width / 5;
                const wmHeight = (watermark.height / watermark.width) * wmWidth;

                // 水印位置設置為右下角，10px 從邊緣
                ctx.drawImage(watermark, canvas.width - wmWidth - 10, canvas.height - wmHeight - 10, wmWidth, wmHeight);

                const dataURL = canvas.toDataURL('image/png');
                editedImages.push(dataURL);
                resolve();
            };
        });
    });

    Promise.all(promises).then(() => {
        displayPreview();
    });
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
    } else {
        processBtn.style.display = 'none';
        // 隱藏預覽區域
        previewSection.style.display = 'none';
    }

    if (totalImages >= 4) {
        uploadArea.classList.add('hidden'); // 隱藏上傳區域
    } else {
        uploadArea.classList.remove('hidden'); // 顯示上傳區域
    }
}
