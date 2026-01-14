// @charset "utf-8";

/**
 * TapArtCroper 圖片垂直切片工具腳本
 * 版本: 1.0.0
 * 描述: 提供圖片上傳並垂直切割成 4 等份的功能
 * 作者: OldCookie
 * 建立日期: 2026年
 * 
 * 主要功能:
 * - 拖放式照片上傳 (單張)
 * - 圖片垂直切割成 4 等高區塊
 * - 預覽切片結果
 * - 批量下載處理後的切片圖片
 */

// 全局變量
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const previewSection = document.getElementById('previewSection');
const previewContainer = document.getElementById('previewContainer');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const sliceBtn = document.getElementById('sliceBtn');

let uploadedImage = null;
let slicedImages = [];
let isMobile = window.innerWidth <= 768;

// 監聽視窗大小變化以更新移動裝置狀態
window.addEventListener('resize', function () {
    isMobile = window.innerWidth <= 768;
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
    if (files.length === 0) return;

    // 只處理第一個文件
    const file = files[0];

    // 限制檔案大小 (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes

    if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" 不是有效的圖片檔案。`);
        return;
    }

    if (file.size > maxSize) {
        alert(`"${file.name}" 檔案太大（超過10MB）。`);
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        // 清空之前的預覽
        imagePreviewContainer.innerHTML = '';
        previewSection.style.display = 'none';
        slicedImages = [];

        const container = document.createElement('div');
        container.classList.add('image-preview-container');

        const imgWrapper = document.createElement('div');
        imgWrapper.classList.add('image-preview-wrapper');

        const img = document.createElement('img');
        img.src = event.target.result;
        img.alt = file.name;
        img.draggable = false;

        // 儲存上傳的圖片數據
        uploadedImage = event.target.result;

        imgWrapper.appendChild(img);
        container.appendChild(imgWrapper);

        // 取消按鈕
        const cancelBtn = document.createElement('button');
        cancelBtn.classList.add('cancel-button');
        cancelBtn.textContent = '取消';
        cancelBtn.setAttribute('aria-label', '取消此照片');
        container.appendChild(cancelBtn);

        imagePreviewContainer.appendChild(container);

        // 取消按鈕行為
        cancelBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isSure = cancelBtn.classList.contains('sure');

            if (!isSure) {
                cancelBtn.textContent = '確定？';
                cancelBtn.classList.add('sure');
                document.addEventListener('click', resetCancelButtons);
            } else {
                removePhoto();
            }
        });

        // 顯示處理按鈕和上傳區域
        updateUIState();
    };
    reader.readAsDataURL(file);
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
function removePhoto() {
    uploadedImage = null;
    imagePreviewContainer.innerHTML = '';
    previewSection.style.display = 'none';
    slicedImages = [];
    updateUIState();
}

// 函數：垂直切片圖片成 4 塊
function sliceImage() {
    if (!uploadedImage) {
        alert('請先上傳照片。');
        return;
    }

    slicedImages = [];

    // 更新按鈕狀態
    sliceBtn.disabled = true;
    sliceBtn.innerHTML = '<span class="material-symbols-outlined" style="margin-right: 8px;">hourglass_empty</span>處理中...';

    const img = new Image();
    img.src = uploadedImage;

    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const originalWidth = img.width;
        const originalHeight = img.height;

        // 每一片的高度 (垂直切成 4 等份)
        const sliceHeight = originalHeight / 4;

        // 切成 4 片
        for (let i = 0; i < 4; i++) {
            // 設置 canvas 大小為單片大小
            canvas.width = originalWidth;
            canvas.height = sliceHeight;

            // 清除 canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 繪製切片 (從原圖的對應位置切割)
            ctx.drawImage(
                img,
                0, i * sliceHeight,           // 源圖片起始座標 (x, y)
                originalWidth, sliceHeight,    // 源圖片切割寬高
                0, 0,                          // 目標 canvas 起始座標
                originalWidth, sliceHeight     // 目標 canvas 繪製寬高
            );

            // 轉換為 DataURL 並儲存
            const dataURL = canvas.toDataURL('image/png');
            slicedImages.push(dataURL);
        }

        // 顯示預覽
        displayPreview();

        // 恢復按鈕狀態
        sliceBtn.disabled = false;
        sliceBtn.innerHTML = '<span class="material-symbols-outlined" style="margin-right: 8px;">content_cut</span>切片圖片';
    };

    img.onerror = () => {
        console.error('載入圖片時出錯。');
        alert('載入圖片時出錯。');
        sliceBtn.disabled = false;
        sliceBtn.innerHTML = '<span class="material-symbols-outlined" style="margin-right: 8px;">content_cut</span>切片圖片';
    };
}

// 函數：顯示預覽
function displayPreview() {
    previewContainer.innerHTML = '';

    const sliceLabels = ['第 1 片（頂部）', '第 2 片', '第 3 片', '第 4 片（底部）'];

    slicedImages.forEach((dataURL, index) => {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'preview-image-wrapper';

        const img = document.createElement('img');
        img.src = dataURL;
        img.alt = `切片 ${index + 1}`;
        img.draggable = false;

        // 添加切片標籤
        const label = document.createElement('div');
        label.className = 'slice-label';
        label.textContent = sliceLabels[index];

        imgWrapper.appendChild(img);
        imgWrapper.appendChild(label);
        previewContainer.appendChild(imgWrapper);
    });

    previewSection.style.display = 'block';
    // 滾動到預覽區域
    previewSection.scrollIntoView({ behavior: 'smooth' });
}

// 函數：下載單張圖片
function downloadImage(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 函數：下載所有圖片
downloadAllBtn.addEventListener('click', () => {
    downloadAllImages();
});

function downloadAllImages() {
    if (slicedImages.length === 0) {
        alert('沒有可下載的圖片。');
        return;
    }

    // 使用 JSZip 打包所有切片成一個 ZIP 檔案
    const zip = new JSZip();

    // 將所有切片加入 ZIP
    slicedImages.forEach((dataURL, index) => {
        // 移除 data URL 的前綴 (data:image/png;base64,)
        const base64Data = dataURL.split(',')[1];
        zip.file(`slice-${index + 1}.png`, base64Data, { base64: true });
    });

    // 生成 ZIP 並下載
    zip.generateAsync({ type: 'blob' }).then(function (content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'sliced-images.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    });
}

// 處理 "切片圖片" 按鈕點擊
sliceBtn.addEventListener('click', () => {
    if (!uploadedImage) {
        alert('請先上傳照片。');
        return;
    }
    sliceImage();
});

// 函數：更新 UI 狀態
function updateUIState() {
    if (uploadedImage) {
        sliceBtn.style.display = 'block';
        uploadArea.classList.add('hidden');
    } else {
        sliceBtn.style.display = 'none';
        uploadArea.classList.remove('hidden');
        previewSection.style.display = 'none';
    }
}

// 初始化應用程序
document.addEventListener('DOMContentLoaded', () => {
    updateUIState();
});
