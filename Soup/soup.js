/**
 * 海龜湯題庫應用程式 - 主要JavaScript文件
 * 提供海龜湯題目的展示、搜尋、詳細頁面和下載功能
 * 使用Material Web 3組件和Markdown支援
 */

// ==================== 全域變數 ====================
/**
 * 儲存所有海龜湯資料的物件
 * 結構: { "題目名稱": { 湯面, 湯底, 類型, 規則, ai? } }
 */
let soupData = {};

/**
 * 當前選中的海龜湯題目名稱
 * null表示在列表頁面，有值表示在詳細頁面
 */
let currentSoup = null;

// ==================== 初始化 ====================
/**
 * 當頁面載入完成時執行初始化
 * 設定Markdown解析器配置並載入資料
 */
document.addEventListener('DOMContentLoaded', function () {
    // 檢查並配置Markdown解析器
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,      // 支援換行符號
            gfm: true,         // 啟用GitHub Flavored Markdown
            sanitize: false    // 不過濾HTML標籤（信任內容）
        });
    }

    // 開始載入海龜湯資料
    loadSoupData();

    // 綁定全域事件監聽器（搜尋、主題切換等）
    bindGlobalEventListeners();
});

// ==================== CSV 解析工具 ====================
/**
 * 解析 CSV 文字為物件陣列
 * @param {string} csvText - CSV 格式的文字
 * @returns {Array} 解析後的物件陣列
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    // 取得表頭
    const headers = lines[0].split(',').map(header => header.trim());
    const rows = [];

    // 解析每一行數據
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            rows.push(row);
        }
    }

    return rows;
}

/**
 * 解析單行 CSV，處理引號和逗號
 * @param {string} line - 單行 CSV 文字
 * @returns {Array} 解析後的值陣列
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // 雙引號轉義
                current += '"';
                i += 2;
            } else {
                // 切換引號狀態
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            // 遇到逗號且不在引號內，結束當前字段
            result.push(current.trim());
            current = '';
            i++;
        } else {
            current += char;
            i++;
        }
    }

    // 添加最後一個字段
    result.push(current.trim());
    return result;
}

/**
 * 轉換 CSV 數據為海龜湯格式
 * @param {Array} csvData - CSV 解析後的數據
 * @returns {Object} 海龜湯數據物件
 */
function convertCSVToSoupData(csvData) {
    const soupData = {};

    csvData.forEach(row => {
        const title = row['湯名'];
        if (!title) return;

        // 忽略時間戳記和電郵地址欄位
        // 檢查是否為 AI 生成題目（通過特定欄位或標記判斷）
        const isAI = row['AI'] === 'TRUE' || row['AI'] === '1' || row['AI'] === 'ai' ||
            row['AI'] === '是' || row['AI'] === 'true' || row['AI'] === 'AI' ||
            row['AI 生成?'] === '是' || row['AI 生成?'] === 'TRUE' || row['AI 生成?'] === '1' ||
            row['ai'] === 'TRUE' || row['ai'] === '1' ||
            row['類型'] === 'AI' ||
            (row['規則'] && row['規則'].includes('AI')) ||
            (row['湯底'] && row['湯底'].includes('AI'));

        // 處理規則和主持人手冊合併
        let rules = '';
        if (row['規則'] && row['規則'].trim()) {
            rules = row['規則'].trim();
        }
        if (row['主持人手冊'] && row['主持人手冊'].trim()) {
            if (rules) {
                rules += '\n\n主持人手冊\n' + row['主持人手冊'].trim();
            } else {
                rules = '主持人手冊\n' + row['主持人手冊'].trim();
            }
        }

        soupData[title] = {
            類型: row['類型'] || '',
            規則: rules,
            湯面: (row['湯面'] || '').replace(/\\n/g, '\n'),
            湯底: (row['湯底'] || '').replace(/\\n/g, '\n'),
            ai: isAI  // 標記是否為 AI 生成
        };
    });

    return soupData;
}

// ==================== 資料載入 ====================
/**
 * 載入海龜湯資料
 * 從單一線上 CSV 文件載入所有數據（包含 AI 和非 AI 題目）
 * 支援錯誤處理和進度顯示
 */
async function loadSoupData() {
    const container = document.getElementById('soup-container');

    // 顯示載入進度條
    container.innerHTML = '<md-linear-progress indeterminate></md-linear-progress>';

    try {
        // 載入統一的線上 CSV 數據（包含所有題目）
        console.log('📡 正在載入統一線上 CSV 數據...');
        const csvResponse = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRurmLf0G6MG6bwMEt1nMKDAteXShwQCe7st4zgfbZoCZauCNzRiLOVykh-LCeoyNZLiyEpJWKunwLx/pub?gid=1825511488&single=true&output=csv');

        if (!csvResponse.ok) {
            throw new Error(`HTTP ${csvResponse.status}: 無法連接到 Google Sheets CSV`);
        }

        const csvText = await csvResponse.text();
        const csvData = parseCSV(csvText);
        const soupDataFromCSV = convertCSVToSoupData(csvData);

        // 分析載入的數據
        const totalCount = Object.keys(soupDataFromCSV).length;
        const aiCount = Object.values(soupDataFromCSV).filter(item => item.ai).length;
        const normalCount = totalCount - aiCount;

        // 檢查是否有任何資料載入成功
        if (totalCount === 0) {
            throw new Error('CSV 數據為空或格式錯誤');
        }

        // 儲存資料並檢查URL參數
        soupData = soupDataFromCSV;
        console.log('✅ 成功載入統一 CSV 數據:', totalCount, '個題目');
        console.log('📊 其中一般題目:', normalCount, '個，AI 題目:', aiCount, '個');

        checkUrlParams();

    } catch (error) {
        console.error('載入資料時發生錯誤:', error);
        // 顯示錯誤訊息給使用者
        container.innerHTML = `
            <div class="empty-state">
                <md-icon>error</md-icon>
                <h2>😅 載入資料時發生錯誤</h2>
                <p>無法連接到線上資料源，請檢查網路連線。</p>
                <p>錯誤詳情: ${error.message}</p>
                <md-filled-button onclick="loadSoupData()" style="margin-top: 1rem;">
                    <md-icon slot="icon">refresh</md-icon>
                    重新載入
                </md-filled-button>
            </div>
        `;
    }
}

// ==================== URL路由處理 ====================
/**
 * 檢查URL參數並決定顯示列表頁面或詳細頁面
 * 支援直接透過URL訪問特定海龜湯題目
 * URL格式: ?題目名稱
 */
function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);

    // 檢查是否是新增頁面
    if (urlParams.get('action') === 'add') {
        renderAddSoupPage();
        return;
    }

    // 取得第一個參數的key作為海龜湯名稱
    const soupName = urlParams.keys().next().value;

    // 如果URL有指定題目且該題目存在，則顯示詳細頁面
    if (soupName && soupData[soupName]) {
        currentSoup = soupName;
        renderDetailPage(soupName, soupData[soupName]);
    } else {
        // 否則顯示題目列表
        currentSoup = null;
        renderSoupList();
    }
}

// ==================== 頁面渲染 ====================
/**
 * 渲染海龜湯題目列表頁面
 * 顯示所有可用的海龜湯題目卡片
 * 包含題目類型、AI標記等資訊
 */
function renderSoupList() {
    const container = document.getElementById('soup-container');
    const header = document.querySelector('header h1');
    const headerDesc = document.querySelector('header p');

    // 更新頁面標題和描述
    header.textContent = '🐢 海龜湯題庫';
    headerDesc.textContent = '點擊卡片查看詳情，挑戰你的推理能力！';

    // 將資料轉換為陣列格式以便處理
    const soupItems = Object.entries(soupData);

    // 檢查是否有資料可顯示
    if (soupItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <md-icon>search_off</md-icon>
                <h2>🤔 沒有找到海龜湯資料</h2>
                <p>請檢查線上資料來源或網路連線。</p>
            </div>
        `;
        return;
    }

    // 產生所有題目卡片的HTML
    container.innerHTML = soupItems.map(([title, data]) =>
        createSoupItemHTML(title, data)
    ).join('');

    // 綁定卡片點擊事件
    bindCardClickEvents();
}

/**
 * 渲染海龜湯詳細頁面
 * @param {string} title - 海龜湯題目標題
 * @param {Object} data - 海龜湯資料物件
 * 顯示完整的題目內容，包含湯面、湯底、規則等
 * 支援揭曉答案功能和Markdown下載
 */
function renderDetailPage(title, data) {
    const container = document.getElementById('soup-container');
    const header = document.querySelector('header h1');
    const headerDesc = document.querySelector('header p');

    // 更新頁面標題
    header.innerHTML = `🐢 ${escapeHtml(title)}`;
    headerDesc.innerHTML = `詳細內容 - 點擊按鈕顯示答案（湯底）`;

    // 檢查是否有規則內容和是否為AI生成
    const hasRules = data.規則 && data.規則.trim() !== '';
    const isAI = data.ai === true;
    const category = title.includes('規則怪談') ? '規則怪談' : '海龜湯';
    const typeClass = getTypeChipClass(data.類型);
    const categoryClass = getCategoryChipClass(category);

    // 產生詳細頁面HTML結構
    container.innerHTML = `
        <div class="soup-detail-container">
            <md-elevated-card class="detail-card">
                <!-- 頁面頂部操作區域 -->
                <div class="detail-header">
                    <div class="header-left-items">
                        <md-filled-tonal-button onclick="goBackToList()" aria-label="返回列表">
                            <md-icon slot="icon">arrow_back</md-icon>
                            返回
                        </md-filled-tonal-button>
                        
                    </div>
                    <div class="detail-actions">
                        <md-filled-tonal-button onclick="downloadAsMarkdown('${escapeHtml(title)}')" aria-label="下載 Markdown">
                            <md-icon slot="icon">download</md-icon>
                            下載
                        </md-filled-tonal-button>
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

                <!-- 遊戲規則區域（如果不是主持人手冊） -->
                ${hasRules && !data.規則.includes('主持人手冊') ? `
                <div class="content-section">
                    <h2><md-icon>gavel</md-icon>遊戲規則</h2>
                    <div class="markdown-content">${formatMarkdownText(data.規則)}</div>
                </div>
                ` : ''}

                <!-- 隱藏的答案區域 -->
                <div class="soup-bottom" id="bottom-${escapeHtml(title)}">
                    <div class="content-section">
                        <h2><md-icon>lightbulb</md-icon>湯底（答案）</h2>
                        <div class="markdown-content">${formatMarkdownText(data.湯底)}</div>
                    </div>
                    
                    <!-- 主持人手冊（如果存在） -->
                    ${hasRules && data.規則.includes('主持人手冊') ? `
                    <div class="content-section">
                        <h2><md-icon>gavel</md-icon>主持人手冊</h2>
                        <div class="markdown-content">${formatMarkdownText(data.規則)}</div>
                    </div>
                    ` : ''}
                </div>

                <!-- 揭曉答案按鈕 -->
                <div class="detail-footer">
                    <md-filled-tonal-button class="reveal-button" data-soup="${escapeHtml(title)}">
                        <md-icon slot="icon">visibility</md-icon>
                        揭曉真相
                    </md-filled-tonal-button>
                </div>
            </md-elevated-card>
        </div>
    `;

    // 綁定揭曉按鈕事件
    bindRevealButtonEvent();
}

/**
 * 渲染新增海龜湯頁面
 * 顯示 Google 表單的 iframe 供使用者填寫新題目
 */
function renderAddSoupPage() {
    // 更新 URL
    const url = new URL(window.location);
    url.searchParams.set('action', 'add');
    window.history.pushState({}, '', url);

    // 設置容器內容
    const container = document.getElementById('soup-container');
    container.innerHTML = `
        <div class="add-soup-page">
            <div class="detail-header">
                <div class="header-left-items">
                    <md-filled-tonal-button onclick="goBackToList()" class="back-button">
                        <md-icon slot="icon">arrow_back</md-icon>
                        返回列表
                    </md-filled-tonal-button>
                </div>
                <h1 class="detail-title">新增海龜湯題目</h1>
                <div class="detail-actions">
                    <md-filled-tonal-button onclick="window.open('https://old-cookie.github.io/EnterTon/EnterTon.html', '_blank')" aria-label="開啟 EnterTon 工具">
                        <md-icon slot="icon">text_format</md-icon>
                        換行工具
                    </md-filled-tonal-button>
                </div>
            </div>
            <div class="add-soup-content">
                <p class="add-soup-description">
                    歡迎分享！填寫下方表單後加入題庫。
                </p>
                <div class="iframe-container">
                    <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSerxSMTksN-qhB71RGPvUPhzvsRBVhhklXXlQ1yUKeD5NAlaw/viewform?embedded=true" 
                            width="100%" 
                            height="1600" 
                            frameborder="0" 
                            marginheight="0" 
                            marginwidth="0">
                        正在載入表單...
                    </iframe>
                </div>
            </div>
        </div>
    `;
}

// ==================== 導航功能 ====================
/**
 * 返回到海龜湯列表頁面
 * 更新URL並重新渲染列表
 */
function goBackToList() {
    // 清除URL參數
    const url = new URL(window.location);
    url.search = '';
    window.history.pushState({}, '', url);

    // 重置當前選中狀態並渲染列表
    currentSoup = null;
    renderSoupList();
}

/**
 * 開啟AI創作指南頁面
 * 在新視窗中開啟prompt.html
 */
function goToPromptPage() {
    window.open('prompt.html', '_blank');
}

// ==================== HTML生成輔助函數 ====================
/**
 * 建立單個海龜湯項目的HTML卡片
 * @param {string} title - 海龜湯題目標題
 * @param {Object} data - 海龜湯資料物件
 * @returns {string} HTML字串
 * 產生包含標題、類型標籤和AI標記的卡片HTML
 */
function createSoupItemHTML(title, data) {
    const isAI = data.ai === true;
    const category = title.includes('規則怪談') ? '規則怪談' : '海龜湯';
    const typeClass = getTypeChipClass(data.類型);
    const categoryClass = getCategoryChipClass(category);

    return `
        <md-elevated-card class="soup-item-card" data-soup="${escapeHtml(title)}">
            <div class="card-header">
                <div class="card-title">${escapeHtml(title)}</div>
                <div class="card-meta">
                    <div class="chip ${typeClass}"><md-icon>category</md-icon>${escapeHtml(data.類型)}</div>
                    <div class="chip ${categoryClass}"><md-icon>style</md-icon>${category}</div>
                    ${isAI ? `<div class="chip chip-ai" onclick="event.stopPropagation(); goToPromptPage()"><md-icon>smart_toy</md-icon>AI 生成</div>` : ''}
                </div>
            </div>
        </md-elevated-card>
    `;
}

/**
 * 獲取類型標籤的 CSS 類別
 * @param {string} type - 類型名稱
 * @returns {string} CSS 類別名稱
 */
function getTypeChipClass(type) {
    // 檢查類型中是否包含變格或本格
    if (type.includes('變格')) {
        return 'chip-type-變格';
    } else if (type.includes('本格')) {
        return 'chip-type-本格';
    }
    return 'chip-type';
}

/**
 * 獲取類別標籤的 CSS 類別
 * @param {string} category - 類別名稱
 * @returns {string} CSS 類別名稱
 */
function getCategoryChipClass(category) {
    const categoryMap = {
        '海龜湯': 'chip-category-海龜湯',
        '規則怪談': 'chip-category-規則怪談'
    };
    return categoryMap[category] || 'chip-category';
}

// ==================== 文字處理工具 ====================
/**
 * 格式化文字內容，支援Markdown渲染
 * @param {string} text - 要格式化的文字
 * @returns {string} 格式化後的HTML字串
 * 如果marked庫可用則渲染Markdown，否則進行基本的HTML轉義和換行處理
 */
function formatMarkdownText(text) {
    if (!text) return '';

    // 如果marked庫可用，使用Markdown渲染
    if (typeof marked !== 'undefined') {
        return marked.parse(text);
    }

    // 否則進行基本的HTML轉義和換行處理
    return escapeHtml(text).replace(/\n/g, '<br>');
}

/**
 * HTML轉義函數，防止XSS攻擊
 * @param {string} text - 要轉義的文字
 * @returns {string} 轉義後的安全HTML字串
 * 將特殊字符轉換為HTML實體
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 事件綁定 ====================
/**
 * 綁定所有海龜湯卡片的點擊事件
 * 點擊卡片會導航到對應的詳細頁面
 */
function bindCardClickEvents() {
    document.querySelectorAll('.soup-item-card').forEach(card => {
        card.addEventListener('click', function () {
            const soupName = this.getAttribute('data-soup');
            navigateToDetail(soupName);
        });
    });
}

/**
 * 導航到海龜湯詳細頁面
 * @param {string} soupName - 海龜湯題目名稱
 * 更新URL並渲染詳細頁面
 */
function navigateToDetail(soupName) {
    // 更新URL以支援書籤和分享
    const url = new URL(window.location);
    url.search = `?${encodeURIComponent(soupName)}`;
    window.history.pushState({}, '', url);

    // 設定當前選中的題目並渲染詳細頁面
    currentSoup = soupName;
    renderDetailPage(soupName, soupData[soupName]);
}

// ==================== 全域事件監聽器 ====================
/**
 * 綁定全域事件監聽器
 * 包含搜尋功能、主題切換、快捷鍵、瀏覽器歷史等
 */
function bindGlobalEventListeners() {
    // ========== 搜索功能 ==========
    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');

    // 監聽搜索輸入變化
    searchInput.addEventListener('input', function () {
        const searchTerm = this.value.trim();
        // 根據是否有搜索內容顯示/隱藏清除按鈕
        clearButton.style.display = searchTerm ? 'flex' : 'none';

        if (!searchTerm) {
            // 如果搜索欄為空，根據當前狀態決定顯示內容
            if (currentSoup) goBackToList();
            else renderSoupList();
        } else {
            // 執行搜索過濾
            filterSoupList(searchTerm);
        }
    });

    // 清除搜索按鈕點擊事件
    clearButton.addEventListener('click', function () {
        searchInput.value = '';
        this.style.display = 'none';
        // 根據當前狀態決定顯示內容
        if (currentSoup) goBackToList();
        else renderSoupList();
    });

    // ========== 新增海龜湯按鈕 ==========
    const addSoupButton = document.getElementById('add-soup-button');
    addSoupButton.addEventListener('click', function () {
        renderAddSoupPage();
    });

    // ========== 初始化完成 ==========
    console.log('海龜湯題庫初始化完成');

    // ========== 瀏覽器歷史管理 ==========
    // 監聽瀏覽器前進/後退按鈕
    window.addEventListener('popstate', () => checkUrlParams());

    // ========== 快捷鍵功能 ==========
    document.addEventListener('keydown', function (e) {
        // R鍵：重新載入資料
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            showSnackbar('正在重新載入資料...');
            loadSoupData();
        }
        // ESC鍵：返回列表頁面（如果在詳細頁面）
        if (e.key === 'Escape' && currentSoup) {
            goBackToList();
        }
        // /鍵：聚焦搜索欄（如果在列表頁面）
        if (e.key === '/' && !currentSoup) {
            e.preventDefault();
            searchInput.focus();
        }
    });
}

// ==================== 搜尋功能 ====================
/**
 * 過濾海龜湯列表根據搜索關鍵字
 * @param {string} searchTerm - 搜索關鍵字
 * 在題目名稱、湯面、湯底、類型、規則中搜索匹配內容
 */
function filterSoupList(searchTerm) {
    const container = document.getElementById('soup-container');
    const header = document.querySelector('header h1');
    const headerDesc = document.querySelector('header p');

    // 更新頁面標題顯示搜索狀態
    header.textContent = `🔍 搜索結果`;
    headerDesc.innerHTML = `"${escapeHtml(searchTerm)}" 的結果`;

    // 將搜索詞轉為小寫以進行不區分大小寫的搜索
    const searchLower = searchTerm.toLowerCase();

    // 在多個欄位中搜索匹配的題目
    const filteredItems = Object.entries(soupData).filter(([title, data]) =>
        title.toLowerCase().includes(searchLower) ||           // 題目名稱
        data.湯面.toLowerCase().includes(searchLower) ||        // 湯面內容
        data.湯底.toLowerCase().includes(searchLower) ||        // 湯底內容
        data.類型.toLowerCase().includes(searchLower) ||        // 類型
        (data.規則 && data.規則.toLowerCase().includes(searchLower)) // 規則（如果存在）
    );

    // 如果沒有找到匹配結果
    if (filteredItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <md-icon>search_off</md-icon>
                <h2>🤔 沒有找到匹配的結果</h2>
                <p>嘗試使用其他關鍵字搜索。</p>
            </div>
        `;
        return;
    }

    // 顯示搜索結果
    container.innerHTML = filteredItems.map(([title, data]) =>
        createSoupItemHTML(title, data)
    ).join('');

    // 重新綁定卡片點擊事件
    bindCardClickEvents();
}

// ==================== 互動功能 ====================
/**
 * 綁定揭曉答案按鈕的事件監聽器
 * 控制答案區域的顯示/隱藏切換
 */
function bindRevealButtonEvent() {
    const button = document.querySelector('.reveal-button');
    if (!button) return;

    button.addEventListener('click', function () {
        const soupTitle = this.getAttribute('data-soup');
        const bottom = document.getElementById(`bottom-${soupTitle}`);

        // 切換答案區域的顯示狀態
        const isRevealed = bottom.classList.toggle('show');

        // 根據狀態更新按鈕文字和圖示
        this.label = isRevealed ? '隱藏真相' : '揭曉真相';
        this.querySelector('md-icon').textContent = isRevealed ? 'visibility_off' : 'visibility';
    });
}

// ==================== 檔案下載功能 ====================
/**
 * 將海龜湯內容下載為Markdown文件
 * @param {string} soupTitle - 海龜湯題目標題
 * 生成包含完整內容的.md文件並觸發下載
 */
function downloadAsMarkdown(soupTitle) {
    const data = soupData[soupTitle];
    if (!data) return;

    // 建構Markdown內容
    let markdownContent = `# ${soupTitle}\n\n`;
    markdownContent += `> ${data.類型}\n\n`;

    // 如果有規則內容，添加規則章節
    if (data.規則 && data.規則.trim() !== '') {
        markdownContent += `## ${data.規則.includes('主持人手冊') ? '主持人手冊' : '遊戲規則'}\n\n${data.規則}\n\n`;
    }

    // 添加湯面和湯底內容
    markdownContent += `## 湯面\n\n${data.湯面}\n\n`;
    markdownContent += `## 湯底\n\n${data.湯底}\n\n`;

    // 添加標籤資訊
    const tags = [data.ai ? 'AI' : null, soupTitle.includes('規則怪談') ? '規則怪談' : '海龜湯'].filter(Boolean);
    if (tags.length > 0) {
        markdownContent += `---\n\n**標籤：** ${tags.join(', ')}\n`;
    }

    // 創建並下載文件
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${soupTitle}.md`;
    a.click();

    // 清理URL物件
    URL.revokeObjectURL(url);

    // 顯示下載成功提示
    showSnackbar(`✅ 已開始下載：${soupTitle}.md`);
}

// ==================== UI通知功能 ====================
/**
 * 顯示Snackbar通知訊息
 * @param {string} message - 要顯示的訊息內容
 * 在頁面底部顯示臨時通知，自動消失
 */
function showSnackbar(message) {
    const container = document.getElementById('snackbar-container');
    const snackbar = document.createElement('md-snackbar');

    // 設定Snackbar屬性
    snackbar.labelText = message;
    snackbar.open = true;

    // 添加到容器中
    container.appendChild(snackbar);

    // 監聽關閉事件，自動移除元素
    snackbar.addEventListener('closed', () => {
        container.removeChild(snackbar);
    });
}