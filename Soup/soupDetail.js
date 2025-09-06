// ==================== 全域變數 ====================
let soupData = null;
let currentSoup = null;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function () {
    // 檢查並配置Markdown解析器
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true,
            sanitize: false
        });
    }

    // 從URL參數獲取題目名稱並載入
    loadSoupFromUrl();
});

// ==================== XLSX 解析工具 ====================
function parseXLSX(xlsxBuffer) {
    try {
        const workbook = XLSX.read(xlsxBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: ''
        });

        if (jsonData.length === 0) return [];

        const headers = jsonData[0];
        const rows = [];

        for (let i = 1; i < jsonData.length; i++) {
            const values = jsonData[i];
            if (values.some(val => val !== '')) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                rows.push(row);
            }
        }

        return rows;
    } catch (error) {
        console.error('解析 XLSX 時發生錯誤:', error);
        return [];
    }
}

function convertXLSXToSoupData(xlsxData) {
    const soupData = {};

    xlsxData.forEach(row => {
        const title = row['湯名'];
        if (!title) return;

        const isAI = row['AI 生成?'] === '是';

        // 確保所有值都是字符串，並且處理可能的 null/undefined
        const safeString = (value) => {
            if (value === null || value === undefined) return '';
            return String(value);
        };

        soupData[title] = {
            類型: safeString(row['類型']),
            規則: safeString(row['規則']),
            主持人手冊: safeString(row['主持人手冊']),
            湯面: safeString(row['湯面']),
            湯底: safeString(row['湯底']),
            其他資料: safeString(row['其他資料']),
            ai: isAI
        };
    });

    return soupData;
}

// ==================== 資料載入 ====================
async function loadSoupFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const soupName = urlParams.keys().next().value;

    if (!soupName) {
        showError('未指定題目名稱');
        return;
    }

    currentSoup = decodeURIComponent(soupName);

    try {
        const xlsxResponse = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQCe9mncrVk9RcF91bPnZIcagCJZAeKLsm2cDOQeSRi3QZYcDPs_CZJxNjOPlpjVCNCKAL7dphkV2hP/pub?output=xlsx');

        if (!xlsxResponse.ok) {
            throw new Error(`HTTP ${xlsxResponse.status}: 無法連接到 Google Sheets XLSX`);
        }

        const xlsxBuffer = await xlsxResponse.arrayBuffer();
        const xlsxData = parseXLSX(xlsxBuffer);
        soupData = convertXLSXToSoupData(xlsxData);

        if (soupData[currentSoup]) {
            renderDetailPage(currentSoup, soupData[currentSoup]);
        } else {
            showError('找不到指定的題目');
        }

    } catch (error) {
        console.error('載入資料時發生錯誤:', error);
        showError('載入資料時發生錯誤: ' + error.message);
    }
}

// ==================== 頁面渲染 ====================
function renderDetailPage(title, data) {
    const container = document.getElementById('soup-detail-container');
    const header = document.getElementById('detail-title');
    const headerDesc = document.getElementById('detail-description');
    const pageTitle = document.getElementById('page-title');

    // 更新頁面標題
    header.innerHTML = `🐢 ${escapeHtml(title)}`;
    headerDesc.innerHTML = `詳細內容 - 點擊按鈕顯示答案（湯底）`;
    pageTitle.textContent = `${title} - 海龜湯題庫`;

    // 檢查是否有規則內容和主持人手冊內容，以及是否為AI生成
    const safeCheck = (value) => {
        return value && typeof value === 'string' && value.trim() !== '';
    };

    const hasRules = safeCheck(data.規則);
    const hasManual = safeCheck(data.主持人手冊);
    const hasOtherData = safeCheck(data.其他資料);
    const isAI = data.ai === true;
    const category = title.includes('規則怪談') ? '規則怪談' : '海龜湯';
    const typeClass = getTypeChipClass(data.類型);
    const categoryClass = getCategoryChipClass(category);

    // 產生詳細頁面HTML結構
    container.innerHTML = `
        <div class="soup-detail-container">
            <md-elevated-card class="detail-card">
                <!-- 頁面頂部操作區域 -->
                <div class="detail-header" style="margin-bottom: 1.5rem;">
                    <div class="header-left-items">
                        <button class="md-button md-button-outlined" onclick="goBackToList()" aria-label="返回列表">
                            <md-icon>arrow_back</md-icon>
                            返回
                        </button>
                    </div>
                    <div class="detail-actions">
                        <button class="md-button md-button-outlined" onclick="downloadAsMarkdown('${escapeHtml(title)}')" aria-label="下載 Markdown">
                            <md-icon>download</md-icon>
                            下載
                        </button>
                    </div>
                </div>

                <!-- 題目標籤區域 -->
                <div class="card-meta" style="justify-content: flex-start; margin-bottom: 1.5rem;">
                    <div class="chip ${typeClass}"><md-icon>category</md-icon>${escapeHtml(data.類型)}</div>
                    <div class="chip ${categoryClass}"><md-icon>style</md-icon>${category}</div>
                    ${isAI ? `<div class="chip chip-ai" onclick="goToPromptPage()"><md-icon>smart_toy</md-icon>AI 生成</div>` : ''}
                </div>

                <!-- 湯面（題目）區域 -->
                <div class="content-section">
                    <h2><md-icon>question_mark</md-icon>湯面（題目）</h2>
                    <div class="markdown-content">${formatMarkdownText(data.湯面)}</div>
                </div>

                <!-- 遊戲規則區域 -->
                ${hasRules ? `
                <div class="content-section">
                    <h2><md-icon>gavel</md-icon>遊戲規則</h2>
                    <div class="markdown-content">${formatMarkdownText(data.規則)}</div>
                </div>
                ` : ''}

                <!-- 其他資料區域 -->
                ${hasOtherData ? `
                <div class="content-section">
                    <h2><md-icon>info</md-icon>其他資料</h2>
                    <div class="other-data-content">${formatOtherDataList(data.其他資料)}</div>
                </div>
                ` : ''}

                <!-- 隱藏的答案區域 -->
                <div class="soup-bottom" id="bottom-${escapeHtml(title)}">
                    <div class="content-section">
                        <h2><md-icon>lightbulb</md-icon>湯底（答案）</h2>
                        <div class="markdown-content">${formatMarkdownText(data.湯底)}</div>
                    </div>
                    
                    <!-- 主持人手冊（如果存在） -->
                    ${hasManual ? `
                    <div class="content-section">
                        <h2><md-icon>gavel</md-icon>主持人手冊</h2>
                        <div class="markdown-content">${formatMarkdownText(data.主持人手冊)}</div>
                    </div>
                    ` : ''}
                </div>

                <!-- 揭曉答案按鈕 -->
                <div class="detail-footer">
                    <button class="md-button md-button-outlined reveal-button" data-soup="${escapeHtml(title)}">
                        <md-icon>visibility</md-icon>
                        揭曉真相
                    </button>
                </div>
            </md-elevated-card>
        </div>
    `;

    // 綁定揭曉按鈕事件
    bindRevealButtonEvent();
}

function showError(message) {
    const container = document.getElementById('soup-detail-container');
    container.innerHTML = `
        <div class="empty-state">
            <md-icon>error</md-icon>
            <h2>😅 發生錯誤</h2>
            <p>${escapeHtml(message)}</p>
            <button class="md-button md-button-outlined" onclick="goBackToList()" style="margin-top: 1rem;">
                <md-icon>arrow_back</md-icon>
                返回列表
            </button>
        </div>
    `;
}

// ==================== 輔助函數 ====================
function getTypeChipClass(type) {
    if (type.includes('變格')) {
        return 'chip-type-變格';
    } else if (type.includes('本格')) {
        return 'chip-type-本格';
    }
    return 'chip-type';
}

function getCategoryChipClass(category) {
    const categoryMap = {
        '海龜湯': 'chip-category-海龜湯',
        '規則怪談': 'chip-category-規則怪談'
    };
    return categoryMap[category] || 'chip-category';
}

function formatMarkdownText(text) {
    if (!text) return '';

    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    }

    return escapeHtml(text).replace(/\n/g, '<br>');
}

function formatOtherDataList(text) {
    if (!text) return '';

    // 解析 Markdown 列表格式
    const lines = text.split('\n').filter(line => line.trim() !== '');
    let listItems = [];

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        // 檢查是否為有序列表 (1. 2. 3.) 或無序列表 (- * +)
        const orderedMatch = trimmedLine.match(/^\d+\.\s*(.+)$/);
        const unorderedMatch = trimmedLine.match(/^[-*+]\s*(.+)$/);

        if (orderedMatch) {
            listItems.push({
                type: 'ordered',
                content: orderedMatch[1],
                index: index
            });
        } else if (unorderedMatch) {
            listItems.push({
                type: 'unordered',
                content: unorderedMatch[1],
                index: index
            });
        } else if (trimmedLine) {
            // 如果不是標準列表格式，直接作為項目
            listItems.push({
                type: 'plain',
                content: trimmedLine,
                index: index
            });
        }
    });

    if (listItems.length === 0) return '';

    // 生成可點擊的列表項目
    const listItemsHtml = listItems.map((item, index) => {
        const itemNumber = index + 1; // 從 1 開始計數
        return `<div class="other-data-item" data-index="${item.index}" onclick="toggleOtherDataItem(this)">
                    <div class="other-data-content-text">${escapeHtml(item.content)}</div>
                    <div class="other-data-overlay" data-item-number="${itemNumber}"></div>
                </div>`;
    }).join('');

    return `<div class="other-data-list">${listItemsHtml}</div>`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 事件處理 ====================
function bindRevealButtonEvent() {
    const button = document.querySelector('.reveal-button');
    if (!button) return;

    button.addEventListener('click', function () {
        const soupTitle = this.getAttribute('data-soup');
        const bottom = document.getElementById(`bottom-${soupTitle}`);

        const isRevealed = bottom.classList.toggle('show');

        this.innerHTML = isRevealed ? '<md-icon>visibility_off</md-icon>隱藏真相' : '<md-icon>visibility</md-icon>揭曉真相';
    });
}

function toggleOtherDataItem(element) {
    const isRevealed = element.classList.toggle('revealed');
    // 使用 CSS 類別來控制顯示/隱藏，而不是直接操作 style
    // 這樣可以確保所有 CSS 屬性都正確應用
}

// ==================== 導航功能 ====================
function goBackToList() {
    window.location.href = 'soup.html';
}

function goToPromptPage() {
    window.open('prompt.html', '_blank');
}

// ==================== 下載功能 ====================
function downloadAsMarkdown(soupTitle) {
    const data = soupData[soupTitle];
    if (!data) return;

    // 安全檢查函數
    const safeCheck = (value) => {
        return value && typeof value === 'string' && value.trim() !== '';
    };

    let markdownContent = `# ${soupTitle}\n\n`;
    markdownContent += `> ${data.類型}\n\n`;

    // 添加規則（如果存在）
    if (safeCheck(data.規則)) {
        markdownContent += `## 遊戲規則\n\n${data.規則}\n\n`;
    }

    // 添加其他資料（如果存在）
    if (safeCheck(data.其他資料)) {
        markdownContent += `## 其他資料\n\n${data.其他資料}\n\n`;
    }

    // 添加湯面和湯底內容
    markdownContent += `## 湯面\n\n${data.湯面}\n\n`;
    markdownContent += `## 湯底\n\n${data.湯底}\n\n`;

    // 添加主持人手冊（如果存在）
    if (safeCheck(data.主持人手冊)) {
        markdownContent += `## 主持人手冊\n\n${data.主持人手冊}\n\n`;
    }

    // 添加標籤資訊
    const tags = [data.ai ? 'AI' : null, soupTitle.includes('規則怪談') ? '規則怪談' : '海龜湯'].filter(Boolean);
    if (tags.length > 0) {
        markdownContent += `---\n\n**標籤：** ${tags.join(', ')}\n`;
    }

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${soupTitle}.md`;
    a.click();

    URL.revokeObjectURL(url);
    showSnackbar(`✅ 已開始下載：${soupTitle}.md`);
}

// ==================== UI通知功能 ====================
function showSnackbar(message) {
    const container = document.getElementById('snackbar-container');
    const snackbar = document.createElement('md-snackbar');

    snackbar.labelText = message;
    snackbar.open = true;

    container.appendChild(snackbar);

    snackbar.addEventListener('closed', () => {
        container.removeChild(snackbar);
    });
}