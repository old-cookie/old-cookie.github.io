// ==================== Global State ====================
let soupData = null;
let currentSoup = null;

function renderDetailSkeletonCard() {
  return `
    <article class="card skeleton" role="status" aria-label="載入中">
      <div role="status" class="skeleton line"></div>
      <div role="status" class="skeleton line"></div>
      <div role="status" class="skeleton line"></div>
      <div role="status" class="skeleton line"></div>
    </article>
  `;
}

// ==================== Initialization ====================
document.addEventListener("DOMContentLoaded", function () {
  // Configure Markdown parser when available
  if (typeof marked !== "undefined") {
    marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false,
    });
  }

  // Resolve title from URL and load data
  loadSoupFromUrl();
});

// ==================== XLSX Parsing ====================
function parseXLSX(xlsxBuffer) {
  try {
    const workbook = XLSX.read(xlsxBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    if (jsonData.length === 0) return [];

    const headers = jsonData[0];
    const rows = [];

    for (let i = 1; i < jsonData.length; i++) {
      const values = jsonData[i];
      if (values.some((val) => val !== "")) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        rows.push(row);
      }
    }

    return rows;
  } catch (error) {
    console.error("解析 XLSX 時發生錯誤:", error);
    return [];
  }
}

function convertXLSXToSoupData(xlsxData) {
  const soupData = {};

  xlsxData.forEach((row) => {
    const title = row["湯名"];
    if (!title) return;

    const isAI = row["AI 生成?"] === "是";

    // Normalize all values as strings and handle null/undefined safely
    const safeString = (value) => {
      if (value === null || value === undefined) return "";
      return String(value);
    };

    soupData[title] = {
      類型: safeString(row["類型"]),
      規則: safeString(row["規則"]),
      主持人手冊: safeString(row["主持人手冊"]),
      湯面: safeString(row["湯面"]),
      湯底: safeString(row["湯底"]),
      其他資料: safeString(row["其他資料"]),
      ai: isAI,
    };
  });

  return soupData;
}

// ==================== Data Loading ====================
async function loadSoupFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const soupName = urlParams.keys().next().value;
  const container = document.getElementById("soup-detail-container");

  if (container) {
    container.innerHTML = renderDetailSkeletonCard();
  }

  if (!soupName) {
    showError("未指定題目名稱");
    return;
  }

  currentSoup = decodeURIComponent(soupName);

  try {
    const xlsxResponse = await fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQCe9mncrVk9RcF91bPnZIcagCJZAeKLsm2cDOQeSRi3QZYcDPs_CZJxNjOPlpjVCNCKAL7dphkV2hP/pub?output=xlsx",
    );

    if (!xlsxResponse.ok) {
      throw new Error(
        `HTTP ${xlsxResponse.status}: 無法連接到 Google Sheets XLSX`,
      );
    }

    const xlsxBuffer = await xlsxResponse.arrayBuffer();
    const xlsxData = parseXLSX(xlsxBuffer);
    soupData = convertXLSXToSoupData(xlsxData);

    if (soupData[currentSoup]) {
      renderDetailPage(currentSoup, soupData[currentSoup]);
    } else {
      showError("找不到指定的題目");
    }
  } catch (error) {
    console.error("載入資料時發生錯誤:", error);
    showError("載入資料時發生錯誤: " + error.message);
  }
}

// ==================== Page Rendering ====================
function renderDetailPage(title, data) {
  const container = document.getElementById("soup-detail-container");
  const header = document.getElementById("detail-title");
  const headerDesc = document.getElementById("detail-description");

  // Update page header
  header.innerHTML = `${escapeHtml(title)}`;
  headerDesc.innerHTML = `詳細內容 - 點擊按鈕顯示答案（湯底）`;
  document.title = `${title} - 海龜湯題庫`;

  // Check optional content blocks and AI flag
  const safeCheck = (value) => {
    return value && typeof value === "string" && value.trim() !== "";
  };

  const hasRules = safeCheck(data.規則);
  const hasManual = safeCheck(data.主持人手冊);
  const hasOtherData = safeCheck(data.其他資料);
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

  // Build detail page HTML
  container.innerHTML = `
      <section class="card">
        <menu class="buttons detail-actions">
          <button onclick="goBackToList()" aria-label="返回列表" type="button">返回</button>
          <button onclick="downloadAsMarkdown('${escapeHtml(title)}')" aria-label="下載 Markdown" type="button">下載</button>
        </menu>

        <p class="meta-badges" aria-label="題目標籤">
          <span class="${typeClass}">${type}</span>
          <span class="${categoryClass}">${category}</span>
          ${isAI ? '<span class="badge warning">AI 生成</span>' : ""}
        </p>

        <div class="content-section">
          <h2>湯面（題目）</h2>
          <div class="markdown-content">${formatMarkdownText(data.湯面)}</div>
        </div>

        ${
          hasRules
            ? `
        <div class="content-section">
          <h2>遊戲規則</h2>
          <div class="markdown-content">${formatMarkdownText(data.規則)}</div>
        </div>
        `
            : ""
        }

        ${
          hasOtherData
            ? `
        <div class="content-section">
          <h2>ℹ️ 其他資料</h2>
          <div class="other-data-content">${formatOtherDataList(data.其他資料)}</div>
        </div>
        `
            : ""
        }

        <details>
          <summary>揭曉真相</summary>
          <div class="detail-reveal">
          <div class="content-section">
            <h2>湯底（答案）</h2>
            <div class="markdown-content">${formatMarkdownText(data.湯底)}</div>
          </div>

          ${
            hasManual
              ? `
          <div class="content-section">
            <h2>主持人手冊</h2>
            <div class="markdown-content">${formatMarkdownText(data.主持人手冊)}</div>
          </div>
          `
              : ""
          }
          </div>
        </details>
      </section>
    `;
}

function showError(message) {
  const container = document.getElementById("soup-detail-container");
  container.innerHTML = `
        <div class="empty-state">
            <h2>發生錯誤</h2>
            <p>${escapeHtml(message)}</p>
            <menu class="buttons" style="justify-content:center; margin-top:1rem;">
              <button onclick="goBackToList()" type="button">返回列表</button>
            </menu>
        </div>
    `;
}

function formatMarkdownText(text) {
  if (!text) return "";

  if (typeof marked !== "undefined") {
    return marked.parse(text);
  }

  return escapeHtml(text).replace(/\n/g, "<br>");
}

function formatOtherDataList(text) {
  if (!text) return "";

  // Parse free-form lines into list items
  const lines = text.split("\n").filter((line) => line.trim() !== "");
  let listItems = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Ordered list line (1. 2. 3.)
    const orderedMatch = trimmedLine.match(/^\d+\.\s*(.+)$/);
    // Unordered list line (- * +)
    const unorderedMatch = trimmedLine.match(/^[-*+]\s*(.+)$/);

    if (orderedMatch) {
      listItems.push({
        type: "ordered",
        content: orderedMatch[1].trim(),
        index: index,
      });
    } else if (unorderedMatch) {
      listItems.push({
        type: "unordered",
        content: unorderedMatch[1].trim(),
        index: index,
      });
    } else if (trimmedLine) {
      // Plain text fallback line
      listItems.push({
        type: "plain",
        content: trimmedLine,
        index: index,
      });
    }
  });

  if (listItems.length === 0) return "";

  // Render native details list items
  const listItemsHtml = listItems
    .map((item, index) => {
      const itemNumber = index + 1; // 1-based index
      const content = item.content;

      return `<details class="other-data-item" data-index="${item.index}">
                  <summary>其他資料 #${itemNumber}</summary>
                  <div class="other-data-content-text">${escapeHtml(content)}</div>
              </details>`;
    })
    .join("");

  return `<div class="other-data-list">${listItemsHtml}</div>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==================== Navigation ====================
function goBackToList() {
  window.location.href = "soup.html";
}

// ==================== Export ====================
function downloadAsMarkdown(soupTitle) {
  const data = soupData[soupTitle];
  if (!data) return;

  // Safe non-empty string check
  const safeCheck = (value) => {
    return value && typeof value === "string" && value.trim() !== "";
  };

  let markdownContent = `# ${soupTitle}\n\n`;
  markdownContent += `> ${data.類型}\n\n`;

  // Add rules block when present
  if (safeCheck(data.規則)) {
    markdownContent += `## 遊戲規則\n\n${data.規則}\n\n`;
  }

  // Add additional notes block when present
  if (safeCheck(data.其他資料)) {
    markdownContent += `## 其他資料\n\n${data.其他資料}\n\n`;
  }

  // Add puzzle and solution blocks
  markdownContent += `## 湯面\n\n${data.湯面}\n\n`;
  markdownContent += `## 湯底\n\n${data.湯底}\n\n`;

  // Add host manual block when present
  if (safeCheck(data.主持人手冊)) {
    markdownContent += `## 主持人手冊\n\n${data.主持人手冊}\n\n`;
  }

  // Add tag metadata
  const tags = [
    data.ai ? "AI" : null,
    soupTitle.includes("規則怪談") ? "規則怪談" : "海龜湯",
  ].filter(Boolean);
  if (tags.length > 0) {
    markdownContent += `---\n\n**Tags:** ${tags.join(", ")}\n`;
  }

  const blob = new Blob([markdownContent], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${soupTitle}.md`;
  a.click();

  URL.revokeObjectURL(url);
  showSnackbar(`已開始下載：${soupTitle}.md`);
}

// ==================== UI Notifications ====================
function showSnackbar(message) {
  if (typeof ot !== "undefined" && typeof ot.toast === "function") {
    ot.toast(message);
    return;
  }

  window.alert(message);
}
