/**
 * Sea Turtle Soup library app - main JavaScript file.
 * Provides listing, search, detail navigation, and export support.
 * Built with Blades CSS and Markdown rendering support.
 */

// ==================== Text Helpers ====================
/**
 * Escape HTML to prevent XSS.
 * @param {string} text - Input text.
 * @returns {string} Escaped HTML string.
 */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Global State ====================
/**
 * Stores all soup puzzle data.
 * Shape: { "Title": { puzzle, solution, type, rules, ai } }
 */
let soupData = {};
let cachedSoupData = null; // shortcut: <ceiling: 5 min TTL, clear on data source change>; <upgrade: add multiple sources w/ invalidation>

function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Currently selected soup title.
 * `null` means list page; non-null means detail page.
 */
let currentSoup = null;

/** Google Sheets URL for all puzzle data */
const SOUP_DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQCe9mncrVk9RcF91bPnZIcagCJZAeKLsm2cDOQeSRi3QZYcDPs_CZJxNjOPlpjVCNCKAL7dphkV2hP/pub?output=xlsx";

function renderListSkeletonCards(count = 3) {
  return Array.from({ length: count })
    .map(
      () => `
        <article class="skeleton-card" role="status" aria-label="載入中">
          <div role="status" class="skeleton line"></div>
          <div role="status" class="skeleton line"></div>
        </article>
      `,
    )
    .join("");
}

// ==================== Initialization ====================
/**
 * Runs app initialization on page load.
 * Configures Markdown parser and starts data loading.
 */
document.addEventListener("DOMContentLoaded", function () {
  // Configure Markdown parser when available
  if (typeof marked !== "undefined") {
    marked.setOptions({
      breaks: true, // Preserve line breaks
      gfm: true, // Enable GitHub Flavored Markdown
      sanitize: true, // XSS guard: strip HTML from trusted content
    });
  }

  // Start loading soup data
  loadSoupData();

  // Bind global events (search, shortcuts, history)
  bindGlobalEventListeners();
});

// ==================== Data Loading ====================
/**
 * Load soup data from a single online XLSX source.
 * Includes both AI and non-AI puzzles.
 * Handles loading state and errors.
 */
async function loadSoupData() {
  if (cachedSoupData) {
    soupData = cachedSoupData;
    checkUrlParams();
    const container = document.getElementById("soup-container");
    if (container && soupData) renderSoupList();
    console.log("已使用快取資料，題目數:", Object.keys(soupData).length);
    return;
  }
  const container = document.getElementById("soup-container");

  // Show loading skeleton cards
  container.innerHTML = renderListSkeletonCards();

  try {
    // Fetch unified XLSX source (all puzzles)
    console.log("正在載入統一線上 XLSX 數據...");
    const xlsxResponse = await fetch(SOUP_DATA_URL);
    if (!xlsxResponse.ok) {
      throw new Error(
        `HTTP ${xlsxResponse.status}: 無法連接到 Google Sheets XLSX`,
      );
    }

    const xlsxBuffer = await xlsxResponse.arrayBuffer();
    const xlsxData = parseXLSX(xlsxBuffer);
    const soupDataFromXLSX = convertXLSXToSoupData(xlsxData);

    // Compute summary metrics
    const totalCount = Object.keys(soupDataFromXLSX).length;
    const aiCount = Object.values(soupDataFromXLSX).filter(
      (item) => item.ai,
    ).length;
    const normalCount = totalCount - aiCount;

    // Validate loaded content
    if (totalCount === 0) {
      throw new Error("XLSX 數據為空或格式錯誤");
    }

    // Store data and resolve route state
    soupData = soupDataFromXLSX;
    cachedSoupData = soupDataFromXLSX;
    console.log("成功載入統一 XLSX 數據:", totalCount, "個題目");
    console.log("其中一般題目:", normalCount, "個，AI 題目:", aiCount, "個");

    checkUrlParams();
  } catch (error) {
    console.error("載入資料時發生錯誤:", error);
    // Render user-friendly error state
    container.innerHTML = `
            <div class="empty-state">
                <span class="icon" aria-hidden="true">!</span>
                <h2>載入資料時發生錯誤</h2>
                <p>無法連接到線上資料源，請檢查網路連線。</p>
                <p>錯誤詳情: ${error.message}</p>
                <button onclick="loadSoupData()" style="margin-top: 1rem;" type="button">
                    <span aria-hidden="true">↻</span>
                    重新載入
                </button>
            </div>
        `;
  }
}

// ==================== URL Routing ====================
/**
 * Resolve URL parameters and decide list/detail route.
 * Supports direct linking by title.
 * URL format: ?title
 */
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);

  // Use the first query key as soup title
  const soupName = urlParams.keys().next().value;

  // Navigate to detail when target title exists
  if (soupName && soupData[soupName]) {
    navigateToDetail(soupName);
  } else {
    // Otherwise show list page
    currentSoup = null;
    renderSoupList();
  }
}

// ==================== Rendering ====================
/**
 * Render the soup puzzle list page.
 * Displays all available puzzle cards with badges.
 */
function renderSoupList() {
  const container = document.getElementById("soup-container");
  const header = document.getElementById("page-title");
  const headerDesc = document.getElementById("page-subtitle");

  // Update page title and subtitle
  header.textContent = "海龜湯題庫";
  headerDesc.textContent = "點擊卡片查看詳情";

  // Convert map to iterable array
  const soupItems = Object.entries(soupData);

  // Handle empty dataset
  if (soupItems.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <span class="icon" aria-hidden="true">搜尋</span>
                <h2>沒有找到海龜湯資料</h2>
                <p>請檢查線上資料來源或網路連線。</p>
            </div>
        `;
    return;
  }

  // Render all puzzle cards
  container.innerHTML = soupItems
    .map(([title, data]) => createSoupItemHTML(title, data))
    .join("");

  // Bind card click events
  bindCardClickEvents();
}

// ==================== Navigation ====================
/**
 * Return to the soup list page.
 * Clears URL query and re-renders list.
 */
function goBackToList() {
  // Clear query string
  const url = new URL(window.location);
  url.search = "";
  window.history.pushState({}, "", url);

  // Reset selection state and render list
  currentSoup = null;
  renderSoupList();
}

// ==================== HTML Helpers ====================
/**
 * Create one soup card HTML block.
 * @param {string} title - Puzzle title.
 * @param {Object} data - Puzzle data object.
 * @returns {string} HTML string.
 */
function createSoupItemHTML(title, data) {
  const isAI = data.ai === true;
  const category = title.includes("規則怪談") ? "規則怪談" : "海龜湯";
  const type = escapeHtml(data.類型 || "未分類");
  const typeClass = type.includes("本格")
    ? "badge success"
    : type.includes("變格")
      ? "badge secondary"
      : "badge";
  const categoryClass =
    category === "規則怪談" ? "badge danger" : "badge outline";

  return `
        <article class="soup-item-card" data-soup="${escapeHtml(title)}">
            <h3>${escapeHtml(title)}</h3>
            <p class="meta-badges" aria-label="題目標籤">
              <span class="${typeClass}">${type}</span>
              <span class="${categoryClass}">${category}</span>
              ${isAI ? '<span class="badge warning">AI 生成</span>' : ""}
            </p>
        </article>
    `;
}

// ==================== Text Helpers ====================
/**
 * Format text content with Markdown support.
 * @param {string} text - Input text.
 * @returns {string} Formatted HTML string.
 */
function formatMarkdownText(text) {
  if (!text) return "";

  // Use Markdown parser when available
  if (typeof marked !== "undefined") {
    return marked.parse(text);
  }

  // Fallback to escaped HTML with line breaks
  return escapeHtml(text).replace(/\n/g, "<br>");
}

// ==================== Event Binding ====================
/**
 * Bind click events for soup cards.
 * Each card opens its detail page.
 */
function bindCardClickEvents() {
  document.querySelectorAll(".soup-item-card").forEach((card) => {
    card.addEventListener("click", function () {
      const soupName = this.getAttribute("data-soup");
      navigateToDetail(soupName);
    });
  });
}

/**
 * Navigate to the soup detail page.
 * @param {string} soupName - Puzzle title.
 */
function navigateToDetail(soupName) {
  // Pass puzzle title as query key
  window.location.href = `soupDetail.html?${encodeURIComponent(soupName)}`;
}

// ==================== Global Events ====================
/**
 * Bind global event listeners.
 * Includes search, shortcuts, and browser history handling.
 */
function bindGlobalEventListeners() {
  // ========== Search ==========
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");

  if (searchForm) {
    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
    });
  }

  // Listen for search input changes (debounced to reduce O(n) filtering on every keystroke)
  const debouncedFilter = debounce((searchTerm) => {
    if (!searchTerm) {
      if (currentSoup) goBackToList();
      else renderSoupList();
    } else {
      filterSoupList(searchTerm);
    }
  }, 200);

  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.trim();
    debouncedFilter(searchTerm);
  });

  // ========== Add Soup Button ==========
  const addSoupButton = document.getElementById("add-soup-button");
  if (addSoupButton) {
    addSoupButton.addEventListener("click", function () {
      window.location.href = "soupAdd.html";
    });
  }

  // ========== Initialization Complete ==========
  console.log("海龜湯題庫初始化完成");

  // ========== Browser History ==========
  // Listen to back/forward navigation
  window.addEventListener("popstate", () => checkUrlParams());

  // ========== Keyboard Shortcuts ==========
  document.addEventListener("keydown", function (e) {
    // R: Reload data
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      showSnackbar("正在重新載入資料...");
      loadSoupData();
    }
    // Escape: Return to list page
    if (e.key === "Escape" && currentSoup) {
      goBackToList();
    }
    // /: Focus search input on list page
    if (e.key === "/" && !currentSoup) {
      e.preventDefault();
      searchInput.focus();
    }
  });
}

// ==================== Search ====================
/**
 * Filter soup list by keyword.
 * @param {string} searchTerm - Search keyword.
 * Matches against title, puzzle text, solution, type, rules, and extra notes.
 */
function filterSoupList(searchTerm) {
  const container = document.getElementById("soup-container");
  const header = document.getElementById("page-title");
  const headerDesc = document.getElementById("page-subtitle");

  // Update search-state heading
  header.textContent = `搜索結果`;
  headerDesc.innerHTML = `"${escapeHtml(searchTerm)}" 的結果`;

  // Case-insensitive search term
  const searchLower = searchTerm.toLowerCase();

  // Match keyword across multiple fields
  const filteredItems = Object.entries(soupData).filter(
    ([title, data]) =>
      title.toLowerCase().includes(searchLower) || // Title
      (data.湯面 && data.湯面.toLowerCase().includes(searchLower)) || // Puzzle
      (data.湯底 && data.湯底.toLowerCase().includes(searchLower)) || // Solution
      (data.類型 && data.類型.toLowerCase().includes(searchLower)) || // Type
      (data.規則 &&
        typeof data.規則 === "string" &&
        data.規則.toLowerCase().includes(searchLower)) || // Rules (if present)
      (data.其他資料 &&
        typeof data.其他資料 === "string" &&
        data.其他資料.toLowerCase().includes(searchLower)), // Extra notes (if present)
  );

  // Handle empty search results
  if (filteredItems.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <span class="icon" aria-hidden="true">搜尋</span>
                <h2>沒有找到匹配的結果</h2>
                <p>嘗試使用其他關鍵字搜索。</p>
            </div>
        `;
    return;
  }

  // Render filtered cards
  container.innerHTML = filteredItems
    .map(([title, data]) => createSoupItemHTML(title, data))
    .join("");

  // Re-bind card click events
  bindCardClickEvents();
}

// ==================== UI Notifications ====================
/**
 * Show a snackbar/toast message.
 * @param {string} message - Message content.
 */
function showSnackbar(message) {
  window.alert(message);
}
