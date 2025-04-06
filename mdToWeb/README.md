# Markdown to Web 轉換器

這是一個簡單但功能強大的工具，用於瀏覽和顯示 Markdown 文件，特別適合用於技術文檔和筆記的展示。

## 特色功能

- **支援多文件瀏覽**：可以在資料夾結構中瀏覽所有 Markdown 文件
- **即時預覽**：無需刷新即可查看格式化的 Markdown 內容
- **程式碼高亮**：支援多種程式語言的語法高亮顯示
- **URL 分享功能**：可以通過 URL 直接共享特定文件和目錄
- **自適應主題**：支援淺色/深色主題，並可根據系統設置自動切換
- **快取優化**：實施緩存破壞策略，確保始終獲取最新內容
- **安全標頭**：實現了適當的 HTTP 標頭策略，包括內容類型控制和安全選項

## 使用方法

### 基本使用

1. 瀏覽文件目錄
2. 點擊任意 Markdown 文件以查看其格式化內容
3. 使用主題切換按鈕在淺色/深色模式間切換

### URL 分享功能

您可以使用以下格式的 URL 直接訪問特定檔案：
[demo](https://old-cookie.github.io/mdToWeb/mdToWeb.html?path=assets/docs&file=demo.md)

URL 參數說明：

- `path`：指定文件的路徑（相對於 assets 目錄）
- `file`：指定要打開的 Markdown 文件名

### 支援的程式語言高亮

- Python
- JavaScript
- Java
- JSON
- XML/HTML
- Markdown
- Dart
- Swift

## 技術實現

- 無需後端伺服器，完全基於前端實現
- 使用 `marked.js` 將 Markdown 轉換為 HTML
- 使用 `highlight.js` 實現程式碼語法高亮
- 使用 History API 實現無刷新 URL 更新

## 未來計劃

- [ ] 添加搜索功能
- [ ] 支援更多程式語言的高亮
- [ ] 可自定義主題
- [ ] 目錄/索引自動生成

## 貢獻

歡迎通過 Issues 或 Pull Requests 提出建議和改進。
