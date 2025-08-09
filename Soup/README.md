# 🐢 海龜湯題庫

一個現代化的海龜湯（情境推理）遊戲題庫，採用 Google Material Web 3 設計系統打造的網頁應用程式。

## ✨ 功能特色

- 🎨 **現代化界面**：採用 Material Web 3 設計系統，支援明/暗主題切換
- 🐢 **豐富題庫**：包含本格推理與變格推理兩種類型的海龜湯題目
- 🔍 **智能搜尋**：支援在題目名稱、內容、類型等多個欄位中搜尋
- 📱 **響應式設計**：完美適配桌面和行動裝置
- 🔗 **深層連結**：支援 URL 路由，可直接分享特定題目
- 📥 **匯出功能**：一鍵下載題目為 Markdown 格式
- ⌨️ **快捷鍵支援**：提供便利的鍵盤操作

## 🎮 什麼是海龜湯？

海龜湯（Situation Puzzle）是一種情境推理遊戲：

- **湯面**：主持人提供一個看似不合理或充滿謎團的情境
- **提問**：玩家透過提出只能用「是」、「否」回答的問題來推理
- **湯底**：最終揭曉事件的真相和完整邏輯

### 遊戲類型

- **本格**：現實中可能發生的事件，注重邏輯推理
- **變格**：現實中不可能發生的事件，包含超自然或荒誕元素

## 🚀 快速開始

1. **線上體驗**：直接訪問 [GitHub Pages](https://old-cookie.github.io/Soup/)
2. **本地運行**：

   ```bash
   # 下載專案
   git clone https://github.com/old-cookie/old-cookie.github.io.git
   cd old-cookie.github.io/Soup
   
   # 使用任何 HTTP 服務器運行
   python -m http.server 8000
   # 或
   npx serve .
   ```

## 📁 專案結構

```text
Soup/
├── soup.html          # 主頁面
├── soup.css           # 樣式表
├── soup.js            # 主要功能邏輯  
├── README.md          # 說明文件
└── assets/
    └── prompt.md      # AI 創作指南
```

## ⌨️ 快捷鍵

| 按鍵 | 功能 |
|------|------|
| `R` | 重新載入資料 |
| `ESC` | 返回題目列表（在詳細頁面時） |
| `/` | 聚焦搜尋欄（在列表頁面時） |

## 🔧 技術特色

- **純前端實現**：無需後端服務器，可直接部署到靜態網站
- **Material Web 3**：Google 最新的 Web 組件庫  
- **Markdown 支援**：使用 marked.js 解析 Markdown 格式內容
- **CSV 線上資料**：直接從 Google Sheets 載入最新題目資料
- **AI 智能識別**：自動檢測和標記 AI 生成題目
- **漸進式載入**：支援大量題目的高效能載入

## 📝 新增題目

### 線上編輯

直接編輯 Google Sheets 即可即時同步：

1. 開啟對應的 Google Sheets
2. 新增題目資料
3. 設定 AI 欄位（是/否）標記題目類型
4. 保存後自動同步到網站

### AI 輔助創作

查看 `assets/prompt.md` 瞭解如何使用 AI 創作海龜湯題目的指南。

## 🎨 自定義主題

應用程式支援明/暗主題自動切換，會記住使用者偏好並同步系統設定。

## 📱 瀏覽器支援

- Chrome 105+
- Firefox 110+
- Safari 16+
- Edge 105+

## 🤝 貢獻

歡迎提交新的海龜湯題目或功能改進：

1. Fork 本專案
2. 創建功能分支
3. 提交變更
4. 發起 Pull Request

## 📄 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](../LICENSE) 文件。

## 🙏 致謝

- [Material Web](https://github.com/material-components/material-web) - UI 組件庫
- [marked.js](https://marked.js.org/) - Markdown 解析器
- 所有貢獻題目的創作者們

---

**享受推理的樂趣吧！** 🕵️‍♂️✨
