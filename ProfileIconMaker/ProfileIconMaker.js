class ProfileIconMaker {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.image = null;
        this.imageData = {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0
        };

        this.isDragging = false;
        this.lastMousePos = { x: 0, y: 0 };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        // 文件上傳
        const fileInput = document.getElementById('fileInput');
        const uploadArea = document.getElementById('uploadArea');

        uploadArea.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // 控制滑桿 - 支援 Material 3 md-slider
        const scaleSlider = document.getElementById('scaleSlider');
        const rotateSlider = document.getElementById('rotateSlider');

        // 使用 change 事件來確保 Material 3 滑桿正常工作
        scaleSlider.addEventListener('input', (e) => {
            this.imageData.scale = parseFloat(e.target.value);
            document.getElementById('scaleValue').textContent = Math.round(e.target.value * 100) + '%';
            this.drawImage();
        });

        scaleSlider.addEventListener('change', (e) => {
            this.imageData.scale = parseFloat(e.target.value);
            document.getElementById('scaleValue').textContent = Math.round(e.target.value * 100) + '%';
            this.drawImage();
        });

        rotateSlider.addEventListener('input', (e) => {
            this.imageData.rotation = parseFloat(e.target.value);
            document.getElementById('rotateValue').textContent = e.target.value + '°';
            this.drawImage();
        });

        rotateSlider.addEventListener('change', (e) => {
            this.imageData.rotation = parseFloat(e.target.value);
            document.getElementById('rotateValue').textContent = e.target.value + '°';
            this.drawImage();
        });

        // 按鈕
        document.getElementById('resetBtn').addEventListener('click', () => this.resetImage());
        document.getElementById('newImageBtn').addEventListener('click', () => this.selectNewImage());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadImage());

        // 畫布拖曳
        this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
        this.canvas.addEventListener('mousemove', (e) => this.drag(e));
        this.canvas.addEventListener('mouseup', () => this.endDrag());
        this.canvas.addEventListener('mouseleave', () => this.endDrag());

        // 觸控支援
        this.canvas.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.drag(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', () => this.endDrag());

        // 窗口大小改變時重新繪製
        window.addEventListener('resize', () => {
            if (this.image) {
                setTimeout(() => this.drawImage(), 100);
            }
        });
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
        });

        uploadArea.addEventListener('drop', (e) => this.handleDrop(e), false);
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadImage(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadImage(file);
        }
    }

    loadImage(file) {
        if (!file.type.startsWith('image/')) {
            alert('請選擇有效的圖片文件！');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this.resetImageData();
                this.showEditor();
                this.drawImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    resetImageData() {
        this.imageData = {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0
        };

        // 重置滑桿
        document.getElementById('scaleSlider').value = 1;
        document.getElementById('scaleValue').textContent = '100%';
        document.getElementById('rotateSlider').value = 0;
        document.getElementById('rotateValue').textContent = '0°';
    }

    showEditor() {
        document.getElementById('editorSection').style.display = 'block';
        document.querySelector('.upload-section').style.display = 'none';
    }

    drawImage() {
        if (!this.image) return;

        // 獲取容器的實際尺寸
        const container = document.querySelector('.canvas-container');
        const containerRect = container.getBoundingClientRect();
        const size = Math.max(200, Math.min(containerRect.width - 4, containerRect.height - 4)); // 最小 200px，減去邊框

        // 設置畫布尺寸為正方形
        this.canvas.width = size;
        this.canvas.height = size;

        // 清空畫布
        this.ctx.clearRect(0, 0, size, size);

        // 保存畫布狀態
        this.ctx.save();

        // 移動到畫布中心
        this.ctx.translate(size / 2, size / 2);

        // 應用旋轉
        this.ctx.rotate(this.imageData.rotation * Math.PI / 180);

        // 計算圖片尺寸
        const scale = this.imageData.scale;
        const imgWidth = this.image.width * scale;
        const imgHeight = this.image.height * scale;

        // 繪製圖片（居中）
        this.ctx.drawImage(
            this.image,
            -imgWidth / 2 + this.imageData.x,
            -imgHeight / 2 + this.imageData.y,
            imgWidth,
            imgHeight
        );

        // 恢復畫布狀態
        this.ctx.restore();
    }

    startDrag(e) {
        this.isDragging = true;
        const rect = this.canvas.getBoundingClientRect();
        this.lastMousePos = {
            x: (e.clientX || e.pageX) - rect.left,
            y: (e.clientY || e.pageY) - rect.top
        };
        this.canvas.style.cursor = 'grabbing';
    }

    drag(e) {
        if (!this.isDragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const currentPos = {
            x: (e.clientX || e.pageX) - rect.left,
            y: (e.clientY || e.pageY) - rect.top
        };

        const deltaX = currentPos.x - this.lastMousePos.x;
        const deltaY = currentPos.y - this.lastMousePos.y;

        this.imageData.x += deltaX;
        this.imageData.y += deltaY;

        this.lastMousePos = currentPos;
        this.drawImage();
    }

    endDrag() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    resetImage() {
        this.resetImageData();
        this.drawImage();
    }

    selectNewImage() {
        document.getElementById('editorSection').style.display = 'none';
        document.querySelector('.upload-section').style.display = 'block';
        document.getElementById('fileInput').value = '';
    }

    downloadImage() {
        if (!this.image) return;

        // 顯示下載進度
        const downloadBtn = document.getElementById('downloadBtn');
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = '處理中...';
        downloadBtn.disabled = true;

        // 創建下載畫布
        const downloadCanvas = document.createElement('canvas');
        const downloadCtx = downloadCanvas.getContext('2d');
        const size = 3000; // 高品質 3000x3000 輸出

        downloadCanvas.width = size;
        downloadCanvas.height = size;

        // 保存狀態
        downloadCtx.save();

        // 移動到畫布中心
        downloadCtx.translate(size / 2, size / 2);

        // 應用旋轉
        downloadCtx.rotate(this.imageData.rotation * Math.PI / 180);

        // 計算圖片尺寸（按比例縮放到下載尺寸）
        const scaleFactor = size / 400; // 400是編輯畫布的尺寸
        const scale = this.imageData.scale * scaleFactor;
        const imgWidth = this.image.width * scale;
        const imgHeight = this.image.height * scale;

        // 繪製圖片
        downloadCtx.drawImage(
            this.image,
            -imgWidth / 2 + this.imageData.x * scaleFactor,
            -imgHeight / 2 + this.imageData.y * scaleFactor,
            imgWidth,
            imgHeight
        );

        // 恢復狀態
        downloadCtx.restore();

        // 嘗試不同品質直到文件小於 1MB
        this.exportWithQualityControl(downloadCanvas, () => {
            // 恢復按鈕狀態
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
        });
    }

    exportWithQualityControl(canvas, callback) {
        let quality = 1.0; // 開始 100% 品質
        const maxFileSize = 1024 * 1024; // 1MB in bytes

        const tryExport = (currentQuality) => {
            canvas.toBlob((blob) => {
                if (blob.size <= maxFileSize || currentQuality <= 0.3) {
                    // 文件大小OK或品質已經很低，執行下載
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `profile-icon-${Date.now()}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    // 顯示品質信息
                    const qualityPercent = Math.round(currentQuality * 100);
                    const fileSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
                    console.log(`已下載：品質 ${qualityPercent}%，文件大小 ${fileSizeMB}MB`);

                    if (callback) callback();
                } else {
                    // 文件太大，降低品質重試
                    const newQuality = Math.max(0.3, currentQuality - 0.1);
                    console.log(`文件大小 ${(blob.size / (1024 * 1024)).toFixed(2)}MB，降低品質到 ${Math.round(newQuality * 100)}%`);
                    setTimeout(() => tryExport(newQuality), 100); // 小延遲避免阻塞UI
                }
            }, 'image/jpeg', currentQuality);
        };

        tryExport(quality);
    }
}

// 確保 Material 3 按鈕文字正確顯示
function ensureButtonTextDisplay() {
    const buttons = document.querySelectorAll('md-filled-button, md-outlined-button');
    buttons.forEach(button => {
        // 確保按鈕有正確的顯示樣式
        if (button.shadowRoot) {
            const buttonElement = button.shadowRoot.querySelector('button');
            if (buttonElement) {
                buttonElement.style.display = 'flex';
                buttonElement.style.alignItems = 'center';
                buttonElement.style.justifyContent = 'center';
                buttonElement.style.gap = '8px';

                // 強制設定文字顏色
                if (button.tagName.toLowerCase() === 'md-filled-button') {
                    buttonElement.style.color = 'var(--md-sys-color-on-primary)';
                } else if (button.tagName.toLowerCase() === 'md-outlined-button') {
                    buttonElement.style.color = 'var(--md-sys-color-primary)';
                }
            }

            // 檢查並修正 label 部分的顏色
            const labelElement = button.shadowRoot.querySelector('.label, [part="label"]');
            if (labelElement) {
                if (button.tagName.toLowerCase() === 'md-filled-button') {
                    labelElement.style.color = 'var(--md-sys-color-on-primary)';
                } else if (button.tagName.toLowerCase() === 'md-outlined-button') {
                    labelElement.style.color = 'var(--md-sys-color-primary)';
                }
            }
        }

        // 確保按鈕本身的顏色
        if (button.tagName.toLowerCase() === 'md-filled-button') {
            button.style.color = 'var(--md-sys-color-on-primary)';
        } else if (button.tagName.toLowerCase() === 'md-outlined-button') {
            button.style.color = 'var(--md-sys-color-primary)';
        }

        // 確保文字內容可見
        const textNodes = button.childNodes;
        textNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                // 為文字節點的父元素設定顏色
                if (button.tagName.toLowerCase() === 'md-filled-button') {
                    node.parentElement.style.color = 'var(--md-sys-color-on-primary)';
                } else if (button.tagName.toLowerCase() === 'md-outlined-button') {
                    node.parentElement.style.color = 'var(--md-sys-color-primary)';
                }
            }
        });
    });
}

// 調試：檢查 Material Web 組件是否正確載入
function debugMaterialComponents() {
    console.log('=== Material Web Components Debug ===');

    // 檢查 customElements
    const buttons = document.querySelectorAll('md-filled-button, md-outlined-button');
    buttons.forEach((button, index) => {
        console.log(`Button ${index + 1}:`, {
            tagName: button.tagName,
            textContent: button.textContent,
            innerHTML: button.innerHTML,
            defined: customElements.get(button.tagName.toLowerCase()) !== undefined,
            shadowRoot: !!button.shadowRoot,
            style: window.getComputedStyle(button).display
        });

        // 檢查是否有隱藏的文字
        const textNodes = Array.from(button.childNodes).filter(node =>
            node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        console.log(`Text nodes in button ${index + 1}:`, textNodes.map(n => n.textContent.trim()));
    });

    // 檢查 Material Web 是否載入
    console.log('Material Web loaded:', typeof window.litElement !== 'undefined');
    console.log('Custom elements defined:', {
        'md-filled-button': customElements.get('md-filled-button') !== undefined,
        'md-outlined-button': customElements.get('md-outlined-button') !== undefined,
        'md-icon': customElements.get('md-icon') !== undefined
    });
}

// 在 DOM 加載完成和組件加載完成後執行
document.addEventListener('DOMContentLoaded', () => {
    new ProfileIconMaker();
    ensureButtonTextDisplay();

    // 延遲執行以確保 Material Web 組件完全加載
    setTimeout(ensureButtonTextDisplay, 100);
    setTimeout(ensureButtonTextDisplay, 500);
    setTimeout(ensureButtonTextDisplay, 1000);
});

// 監聽 Material Web 組件的加載事件
window.addEventListener('load', ensureButtonTextDisplay);

// 添加鍵盤快捷鍵
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 's':
                e.preventDefault();
                document.getElementById('downloadBtn').click();
                break;
            case 'r':
                e.preventDefault();
                document.getElementById('resetBtn').click();
                break;
            case 'o':
                e.preventDefault();
                document.getElementById('fileInput').click();
                break;
        }
    }
});

// 添加滾輪縮放功能
document.getElementById('canvas').addEventListener('wheel', (e) => {
    e.preventDefault();

    const scaleSlider = document.getElementById('scaleSlider');
    const currentScale = parseFloat(scaleSlider.value);
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, currentScale + delta));

    scaleSlider.value = newScale;
    document.getElementById('scaleValue').textContent = Math.round(newScale * 100) + '%';

    // 觸發事件
    scaleSlider.dispatchEvent(new Event('input'));
});

// 在組件載入後執行調試
setTimeout(debugMaterialComponents, 2000);