// @charset "utf-8";
/**
 * 資料夾圖示製作工具
 * 版本: 2.0.0
 * 描述: 將照片與Windows 11風格資料夾圖示合併，創建自定義資料夾圖示
 * 作者: OldCookie
 * 建立日期: 2025年
 * 
 * 主要功能:
 * - 允許使用者上傳或拖放照片
 * - 可調整照片比例並透過拖曳定位
 * - 自動從照片提取主要顏色供選擇
 * - 自訂資料夾深色和亮藍色部分的顏色
 * - 匯出為可用於Windows的資料夾圖示(.ico)
 * - 自動跟隨系統深色/淺色模式
 * - 支援行動裝置與觸控操作
 */

//===================================
// DOM 元素和全域變數宣告
//===================================
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const photoInput = document.getElementById('photoInput');
const photoScale = document.getElementById('photoScale');
const scaleValue = document.getElementById('scaleValue');
const exportBtn = document.getElementById('exportBtn');
const darkColorInput = document.getElementById('darkColor');
const blueColorInput = document.getElementById('blueColor');
const photoColors = document.getElementById('photoColors');
const uploadArea = document.getElementById('uploadArea');
const scaleControl = document.getElementById('scaleControl');

// 狀態變數
let photo = null;          // 使用者上傳的照片對象
let svg = null;            // 資料夾SVG圖示對象
let photoScaleValue = 1;   // 照片縮放比例
let svgDarkColor = '#121313'; // 資料夾深色部分顏色
let svgBlueColor = '#09B8E5'; // 資料夾亮藍色部分顏色
let photoX = 0;            // 照片X座標位置
let photoY = 0;            // 照片Y座標位置
let isDragging = false;    // 拖曳狀態標記
let dragStartX = 0;        // 拖曳起始X座標
let dragStartY = 0;        // 拖曳起始Y座標

// 更新為完整的 Windows 圖示尺寸支援
const iconSizes = [256, 128, 64, 48, 40, 32, 24, 20, 16]; // Windows 標準圖示尺寸

//===================================
// 拖放功能實作
//===================================
// 處理拖曳
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        handlePhotoUpload(files[0]);
    }
});

// 處理點擊上傳
uploadArea.addEventListener('click', () => {
    photoInput.click();
});

// 處理照片選擇
photoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handlePhotoUpload(e.target.files[0]);
    }
});

//===================================
// 照片處理函數
//===================================
/**
 * 處理照片上傳並顯示於畫布上
 * @param {File} file - 使用者上傳的影像檔案
 */
function handlePhotoUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        photo = new Image();
        photo.src = e.target.result;
        photo.onload = () => {
            // 圖片加載後顯示縮放控制
            scaleControl.style.display = 'flex';
            // 將照片置中
            photoX = (canvas.width - photo.width * photoScaleValue) / 2;
            photoY = (canvas.height - photo.height * photoScaleValue) / 2;
            if (svg) drawCanvas();
            // 提取並顯示顏色
            displayColors(extractColors(photo));
        };
    };
    reader.readAsDataURL(file);
}

/**
 * 載入SVG資料夾圖示並套用指定顏色
 */
function loadSVG() {
    fetch('assets/windows11-folder-default.svg')
        .then(response => response.text())
        .then(svgText => {
            // 替換顏色
            svgText = svgText.replace(/#121313/g, svgDarkColor);
            svgText = svgText.replace(/#09B8E5/g, svgBlueColor);
            // 載入彩色 SVG 作為背景
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            svg = new Image();
            svg.src = url;
            svg.onload = () => {
                if (photo) drawCanvas();
            };
        });
}

// 初始載入SVG資料夾圖示
loadSVG();

/**
 * 從圖像中提取主要顏色
 * @param {Image} image - 要分析的圖像
 * @return {Array} 提取出的十種主要顏色hex值陣列
 */
function extractColors(image) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    tempCtx.drawImage(image, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const pixels = imageData.data;
    const colorCounts = {};
    
    // 以40像素間隔取樣以提高效能
    for (let i = 0; i < pixels.length; i += 40) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const rgb = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
    }
    
    // 返回出現頻率最高的10種顏色
    return Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([color]) => color);
}

/**
 * 顯示從圖像中提取的顏色供用戶選擇
 * @param {Array} colors - 顏色hex值陣列
 */
function displayColors(colors) {
    photoColors.innerHTML = '';
    colors.forEach(color => {
        const btn = document.createElement('div');
        btn.className = 'color-btn';
        btn.style.backgroundColor = color;
        btn.addEventListener('click', () => {
            if (window.event.shiftKey) {
                blueColorInput.value = color;
                svgBlueColor = color;
            } else {
                darkColorInput.value = color;
                svgDarkColor = color;
            }
            loadSVG();
        });
        btn.title = 'Click to set dark color, Shift+Click to set blue color';
        photoColors.appendChild(btn);
    });
}

//===================================
// 事件監聽器
//===================================
// 照片縮放事件
photoScale.addEventListener('input', (e) => {
    photoScaleValue = parseFloat(e.target.value);
    scaleValue.textContent = photoScaleValue.toFixed(1);
    drawCanvas();
});

// 顏色選擇事件
darkColorInput.addEventListener('input', (e) => {
    svgDarkColor = e.target.value;
    loadSVG();
});

blueColorInput.addEventListener('input', (e) => {
    svgBlueColor = e.target.value;
    loadSVG();
});

//===================================
// 照片拖曳功能實作 (增加觸控支援)
//===================================
// 滑鼠事件
canvas.addEventListener('mousedown', (e) => {
    if (!photo) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    isDragging = true;
    dragStartX = x - photoX;
    dragStartY = y - photoY;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    photoX = x - dragStartX;
    photoY = y - dragStartY;
    drawCanvas();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

// 觸控事件
canvas.addEventListener('touchstart', (e) => {
    if (!photo) return;
    e.preventDefault(); // 防止滾動
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    isDragging = true;
    dragStartX = x - photoX;
    dragStartY = y - photoY;
});

canvas.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    photoX = x - dragStartX;
    photoY = y - dragStartY;
    drawCanvas();
});

canvas.addEventListener('touchend', () => {
    isDragging = false;
});

canvas.addEventListener('touchcancel', () => {
    isDragging = false;
});

//===================================
// 繪製與匯出功能
//===================================
/**
 * 在畫布上繪製資料夾背景與照片
 * 修正行動裝置上的繪製問題，處理高解析度螢幕
 */
function drawCanvas() {
    if (!photo || !svg) return;
    
    // 確保畫布的邏輯尺寸與實際顯示尺寸匹配
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
    
    // 解決高DPI螢幕上的模糊問題
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.scale(dpr, dpr);
    }
    
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    // 繪製 SVG (背景)
    ctx.drawImage(svg, 0, 0, displayWidth, displayHeight);
    
    // 繪製照片
    const scaledWidth = photo.width * photoScaleValue;
    const scaledHeight = photo.height * photoScaleValue;
    ctx.drawImage(photo, photoX, photoY, scaledWidth, scaledHeight);
}

/**
 * 匯出處理好的資料夾圖示為ICO檔案
 * 為行動裝置優化下載體驗
 */
exportBtn.addEventListener('click', () => {
    if (!photo || !svg) return;
    
    // 顯示處理訊息
    const status = document.createElement('div');
    status.className = 'status-message';
    status.textContent = '正在產生ICO檔案...';
    document.body.appendChild(status);
    
    try {
        // 更新狀態訊息以顯示進度
        status.textContent = '正在產生多尺寸圖示...';
        
        // 使用自己實現的ICO創建方法
        createICO().then(blob => {
            status.textContent = '下載中...';
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'folder-icon.ico';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            
            setTimeout(() => {
                status.remove();
            }, 2000);
        }).catch(error => {
            console.error('ICO創建錯誤:', error);
            status.textContent = '發生錯誤，改用PNG下載';
            fallbackToPNG();
            setTimeout(() => {
                status.remove();
            }, 3000);
        });
    } catch (error) {
        console.error('無法產生ICO檔案:', error);
        status.textContent = '發生錯誤，改用PNG下載';
        fallbackToPNG();
        setTimeout(() => {
            status.remove();
        }, 3000);
    }
});

/**
 * 創建ICO格式檔案
 * @return {Promise<Blob>} 包含ICO檔案的Blob對象
 */
async function createICO() {
    // 收集各尺寸的PNG數據
    const pngBlobs = await Promise.all(iconSizes.map(size => createSizedPNG(size)));
    
    // 創建ICO文件結構
    // ICO文件格式: 
    // - 標頭 (6 bytes)
    // - 圖像目錄 (每個圖像16 bytes)
    // - 圖像數據 (每個PNG塊)
    
    // 準備標頭數據
    const headerBuffer = new ArrayBuffer(6);
    const headerView = new DataView(headerBuffer);
    headerView.setUint16(0, 0, true); // 保留值，必須為0
    headerView.setUint16(2, 1, true); // 圖像類型: 1 = ICO
    headerView.setUint16(4, pngBlobs.length, true); // 圖像數量
    
    // 準備目錄和圖像數據
    const directorySize = pngBlobs.length * 16;
    const directoryBuffer = new ArrayBuffer(directorySize);
    const directoryView = new DataView(directoryBuffer);
    
    // 計算圖像數據的偏移量基準點
    let dataOffset = 6 + directorySize;
    const pngData = [];
    
    // 創建圖像目錄
    for (let i = 0; i < pngBlobs.length; i++) {
        const blob = pngBlobs[i];
        const arrayBuffer = await blob.arrayBuffer();
        const size = iconSizes[i];
        
        // 設定目錄項目
        const offset = i * 16;
        directoryView.setUint8(offset, size); // 寬度
        directoryView.setUint8(offset + 1, size); // 高度
        directoryView.setUint8(offset + 2, 0); // 調色板數量
        directoryView.setUint8(offset + 3, 0); // 保留值
        directoryView.setUint16(offset + 4, 1, true); // 色彩平面數
        directoryView.setUint16(offset + 6, 32, true); // 每像素位元數
        directoryView.setUint32(offset + 8, arrayBuffer.byteLength, true); // 圖像大小
        directoryView.setUint32(offset + 12, dataOffset, true); // 圖像數據偏移
        
        // 更新下一個圖像的偏移量
        dataOffset += arrayBuffer.byteLength;
        
        // 保存PNG數據以便稍後寫入
        pngData.push(new Uint8Array(arrayBuffer));
    }
    
    // 合併所有數據
    const totalSize = dataOffset;
    const resultBuffer = new ArrayBuffer(totalSize);
    const resultArray = new Uint8Array(resultBuffer);
    
    // 寫入標頭
    resultArray.set(new Uint8Array(headerBuffer), 0);
    // 寫入目錄
    resultArray.set(new Uint8Array(directoryBuffer), 6);
    
    // 寫入圖像數據
    let currentOffset = 6 + directorySize;
    for (const data of pngData) {
        resultArray.set(data, currentOffset);
        currentOffset += data.byteLength;
    }
    
    // 創建並返回Blob
    return new Blob([resultBuffer], { type: 'image/x-icon' });
}

/**
 * 為指定尺寸創建PNG圖像
 * @param {number} size - 圖像尺寸
 * @return {Promise<Blob>} PNG格式的Blob對象
 */
async function createSizedPNG(size) {
    return new Promise((resolve) => {
        // 創建畫布
        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = size;
        iconCanvas.height = size;
        const iconCtx = iconCanvas.getContext('2d');
        
        // 計算目前顯示區域的比例
        const displayWidth = canvas.clientWidth;
        
        // 繪製縮小後的資料夾SVG
        iconCtx.drawImage(svg, 0, 0, displayWidth, displayWidth, 0, 0, size, size);
        
        // 計算縮放比例
        const scaleFactor = size / displayWidth;
        
        // 繪製縮小後的照片
        const scaledWidth = photo.width * photoScaleValue * scaleFactor;
        const scaledHeight = photo.height * photoScaleValue * scaleFactor;
        const scaledX = photoX * scaleFactor;
        const scaledY = photoY * scaleFactor;
        iconCtx.drawImage(photo, scaledX, scaledY, scaledWidth, scaledHeight);
        
        // 將畫布轉換為PNG數據
        iconCanvas.toBlob(resolve, 'image/png');
    });
}

/**
 * 若ICO轉換失敗，回退到PNG下載
 */
function fallbackToPNG() {
    // 創建用於導出的 256x256 畫布 (更新為最大尺寸)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 256;
    exportCanvas.height = 256;
    const exportCtx = exportCanvas.getContext('2d');
    
    // 計算目前顯示區域的比例
    const displayWidth = canvas.clientWidth;
    
    // 繪製縮小後的資料夾 SVG
    exportCtx.drawImage(svg, 0, 0, displayWidth, displayWidth, 0, 0, 256, 256);
    
    // 計算縮放比例
    const scaleFactor = 256 / displayWidth;
    
    // 繪製縮小後的照片
    const scaledWidth = photo.width * photoScaleValue * scaleFactor;
    const scaledHeight = photo.height * photoScaleValue * scaleFactor;
    const scaledX = photoX * scaleFactor;
    const scaledY = photoY * scaleFactor;
    exportCtx.drawImage(photo, scaledX, scaledY, scaledWidth, scaledHeight);
    
    const link = document.createElement('a');
    link.download = 'folder-icon.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}

// 在頁面載入時重置畫布尺寸
window.addEventListener('load', () => {
    // 由於CSS可能影響畫布大小，確保在頁面載入後重新調整
    if (photo && svg) {
        drawCanvas();
    }
});

// 在視窗尺寸變化時重置畫布
window.addEventListener('resize', debounce(() => {
    if (photo && svg) {
        drawCanvas();
    }
}, 250));

// 防抖函數以避免過度重繪
function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// 監聽系統深淺色模式變化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    // 當系統深淺色模式變化時，重新繪製畫布以適應新的配色方案
    if (photo && svg) {
        drawCanvas();
    }
});
