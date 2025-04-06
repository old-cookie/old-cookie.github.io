# Markdown to Web 示例

這是一個示例 Markdown 文件，用於測試 Markdown to Web 轉換器。

## 功能特點

- 支持自動暗黑模式
- 適配移動端設備
- 目錄瀏覽功能
- 即時預覽轉換

### 代碼示例

```javascript
// 主題切換功能
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}
```

### 表格示例

| 功能 | 說明 |
|------|------|
| 暗黑模式 | 自動適應系統主題，或手動切換 |
| 移動端適配 | 響應式設計，適合各種屏幕大小 |
| 目錄瀏覽 | 瀏覽 assets 目錄中的 Markdown 文件 |
| 即時預覽 | 即時將 Markdown 轉換為 HTML 預覽 |

> 這是一個引用文本，用於演示引用樣式。

1. 第一步：瀏覽文件
2. 第二步：編輯內容
3. 第三步：預覽結果

---

感謝使用 Markdown to Web 轉換器！
