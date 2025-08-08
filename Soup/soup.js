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

// ==================== 資料載入 ====================
/**
 * 載入海龜湯資料
 * 並行載入一般題目和AI生成題目，合併後顯示
 * 支援錯誤處理和進度顯示
 */
async function loadSoupData() {
    const container = document.getElementById('soup-container');

    // 顯示載入進度條
    container.innerHTML = '<md-linear-progress indeterminate></md-linear-progress>';

    try {
        // 並行載入兩個JSON文件以提升效能
        const [normalResponse, aiResponse] = await Promise.all([
            fetch('./assets/soups.json'),      // 一般海龜湯題目
            fetch('./assets/ai_soups.json')   // AI生成的題目
        ]);

        let combinedData = {};

        // 處理一般海龜湯資料
        if (normalResponse.ok) {
            const data = await normalResponse.json();
            combinedData = { ...combinedData, ...data };
        } else {
            console.warn('無法載入 soups.json');
        }

        // 處理AI生成的海龜湯資料，並標記為AI生成
        if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            // 為所有AI題目添加標記
            for (const key in aiData) {
                aiData[key].ai = true;
            }
            combinedData = { ...combinedData, ...aiData };
        } else {
            console.warn('無法載入 ai_soups.json');
        }

        // 檢查是否有任何資料載入成功
        if (Object.keys(combinedData).length === 0) {
            throw new Error('所有資料源均無法載入');
        }

        // 儲存合併後的資料並檢查URL參數
        soupData = combinedData;
        checkUrlParams();

    } catch (error) {
        console.error('載入資料時發生錯誤:', error);
        // 顯示錯誤訊息給使用者
        container.innerHTML = `
            <div class="empty-state">
                <md-icon>error</md-icon>
                <h2>😅 載入資料時發生錯誤</h2>
                <p>請確認 assets/soups.json 或 assets/ai_soups.json 檔案存在且格式正確。</p>
                <p>錯誤詳情: ${error.message}</p>
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
                <p>請檢查 soups.json 檔案內容。</p>
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
                    <div class="chip chip-type"><md-icon>category</md-icon>${escapeHtml(data.類型)}</div>
                    <div class="chip chip-category"><md-icon>style</md-icon>${title.includes('規則怪談') ? '規則怪談' : '海龜湯'}</div>
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
    return `
        <md-elevated-card class="soup-item-card" data-soup="${escapeHtml(title)}">
            <div class="card-header">
                <div class="card-title">${escapeHtml(title)}</div>
                <div class="card-meta">
                    <div class="chip chip-type"><md-icon>category</md-icon>${escapeHtml(data.類型)}</div>
                    <div class="chip chip-category"><md-icon>style</md-icon>${title.includes('規則怪談') ? '規則怪談' : '海龜湯'}</div>
                    ${isAI ? `<div class="chip chip-ai" onclick="event.stopPropagation(); goToPromptPage()"><md-icon>smart_toy</md-icon>AI 生成</div>` : ''}
                </div>
            </div>
        </md-elevated-card>
    `;
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

    // ========== 主題切換功能 ==========
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        // 切換深色主題類別
        const isDark = document.body.classList.toggle('dark-theme');
        // 更新按鈕圖示
        themeToggle.querySelector('md-icon').textContent = isDark ? 'light_mode' : 'dark_mode';
        // 儲存主題偏好到本地存儲
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    // ========== 初始化主題設定 ==========
    const savedTheme = localStorage.getItem('theme');
    // 根據儲存的偏好或系統偏好設定主題
    if (savedTheme === 'dark' || (savedTheme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-theme');
        themeToggle.querySelector('md-icon').textContent = 'light_mode';
    }

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

// ==================== 開發者資訊 ====================
/**
 * 控制台歡迎訊息和功能說明
 * 在開發者工具中顯示應用程式資訊和可用功能
 */
console.log(`
🐢 海龜湯題庫 (Material Web 3) 載入完成！

功能特色：
✨ Material Web 3 介面
✨ Markdown 格式支援
🤖 AI 湯題支援
🔗 路由功能
🔍 搜索功能

快捷鍵：
- R: 重新載入資料
- ESC: 返回列表
- /: 聚焦搜索欄

享受推理的樂趣吧！ 🕵️‍♂️
`);