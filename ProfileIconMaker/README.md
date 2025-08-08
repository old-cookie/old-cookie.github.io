# Profile Icon Maker 🖼️

一個功能強大的線上頭像製作工具，讓您輕鬆創建完美的正方形頭像圖片。

![Profile Icon Maker](https://img.shields.io/badge/Version-1.0-blue.svg) ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

## ✨ 功能特色

### 🎨 專業編輯功能

- **智能裁切**: 自動將圖片處理為正方形格式
- **圓形預覽**: 即時預覽頭像在圓形框中的效果
- **精確調整**: 支援縮放、旋轉、拖拽定位
- **高品質輸出**: 生成 3000×3000 像素的高解析度圖片

### 🎯 使用者體驗

- **拖放上傳**: 支援拖拽檔案到頁面上傳
- **即時預覽**: 所有調整立即反映在預覽中
- **響應式設計**: 完美適配各種裝置螢幕
- **深色模式**: 自動偵測系統主題或手動切換

### ⚡ 技術亮點

- **Material Design 3**: 採用最新 Material Design 3 設計語言
- **檔案大小優化**: 自動調整品質確保檔案小於 1MB
- **跨平台相容**: 支援所有現代瀏覽器
- **無伺服器運行**: 純前端實現，保護隱私

## 🚀 使用方法

### 1. 上傳圖片

- 點擊上傳區域選擇圖片
- 或直接將圖片拖拽到頁面上
- 支援 JPG、PNG、GIF 格式

### 2. 調整圖片

- **縮放**: 使用滑桿調整圖片大小 (50%-300%)
- **旋轉**: 精確調整角度 (-180° 到 +180°)
- **定位**: 直接拖拽圖片調整位置

### 3. 下載成品

- 點擊「下載圖片」按鈕
- 自動生成 3000×3000 像素的 JPG 格式圖片
- 檔案大小自動優化至 1MB 以下

## 🎮 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `Ctrl/Cmd + S` | 下載圖片 |
| `Ctrl/Cmd + R` | 重置設定 |
| `Ctrl/Cmd + O` | 選擇新圖片 |
| `滾輪` | 在畫布上滾動可縮放圖片 |

## 🛠️ 技術架構

### 前端技術

- **HTML5**: 語意化標記結構
- **CSS3**: Material Design 3 設計系統
- **Vanilla JavaScript**: 原生 JavaScript 實現
- **Canvas API**: 圖片處理和渲染
- **Material Web Components**: Google 官方 Material 3 組件

### 核心功能實現

```javascript
// 主要類別結構
class ProfileIconMaker {
    // 圖片載入和處理
    // 畫布渲染
    // 使用者互動
    // 檔案匯出
}
```

### 設計特色

- **適應性主題**: 自動跟隨系統深色/淺色模式
- **響應式佈局**: 支援桌面、平板、手機各種裝置
- **Material 3 Token**: 完整實現 Material Design 3 色彩系統
- **無障礙設計**: 支援鍵盤導航和螢幕閱讀器

## 📱 裝置相容性

### 支援的瀏覽器

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### 支援的裝置

- 🖥️ 桌面電腦 (1024px+)
- 💻 筆記型電腦 (768px+)
- 📱 平板電腦 (480px+)
- 📱 智慧型手機 (280px+)

## 🎨 設計系統

### Material Design 3

本專案採用 Google 最新的 Material Design 3 設計語言：

- **動態色彩**: 支援系統主題色彩
- **高度系統**: 使用 Material 3 高度層級
- **字體層級**: 完整的字體大小系統
- **狀態系統**: 互動狀態視覺回饋

### 顏色主題

```css
/* 淺色模式 */
--md-sys-color-primary: #6750a4;
--md-sys-color-on-primary: #ffffff;

/* 深色模式 */
--md-sys-color-primary: #d0bcff;
--md-sys-color-on-primary: #381e72;
```

## 📦 專案檔案結構

```text
ProfileIconMaker/
├── ProfileIconMaker.html    # 主要 HTML 檔案
├── ProfileIconMaker.css     # 樣式表 (Material Design 3)
├── ProfileIconMaker.js      # 核心 JavaScript 邏輯
└── README.md               # 專案說明文件
```

## 🔧 本地開發

### 安裝與運行

```bash
# 複製專案
git clone [repository-url]

# 進入專案目錄
cd ProfileIconMaker

# 啟動本地伺服器 (可選)
python -m http.server 8000
# 或
npx serve .
```

### 開發環境需求

- 現代瀏覽器 (支援 ES6+)
- 本地 HTTP 伺服器 (可選，建議用於開發)

## 🚀 部署方式

### GitHub Pages

```bash
# 將檔案上傳到 GitHub 倉庫
# 在倉庫設定中啟用 GitHub Pages
# 選擇 main 分支作為來源
```

### Netlify

```bash
# 將專案資料夾拖拽到 Netlify Deploy 頁面
# 或連接 GitHub 倉庫自動部署
```

### 其他靜態託管

- Vercel
- Firebase Hosting
- AWS S3
- 任何支援靜態檔案的託管服務

## 🎯 使用場景

- 📸 **社群媒體頭像**: 為 Facebook、Twitter、Instagram 等製作頭像
- 💼 **專業形象**: 製作 LinkedIn、履歷等職場頭像
- 🎮 **遊戲頭像**: 為遊戲平台創建個人頭像
- 👨‍💼 **企業用途**: 製作員工頭像、聯絡人頭像
- 🎨 **個人創作**: 藝術作品、插畫的頭像化處理

## 📄 授權條款

MIT License - 詳見 [LICENSE](../LICENSE) 檔案

## 🤝 貢獻指南

歡迎提交 Issues 和 Pull Requests！

### 開發流程

1. Fork 專案
2. 建立特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 建立 Pull Request

### 程式碼風格

- 使用 ESLint 檢查 JavaScript
- 遵循 Material Design 3 設計原則
- 保持響應式設計相容性

## 📞 聯絡資訊

- 🌐 專案網址: [ProfileIconMaker](https://old-cookie.github.io/ProfileIconMaker/)
- 📧 問題回報: [GitHub Issues](https://github.com/old-cookie/old-cookie.github.io/issues)
- 💬 討論交流: [GitHub Discussions](https://github.com/old-cookie/old-cookie.github.io/discussions)

## 🙏 致謝

- [Material Design 3](https://m3.material.io/) - 設計系統
- [Material Web Components](https://github.com/material-components/material-web) - UI 組件
- [Google Fonts](https://fonts.google.com/) - Roboto 字體
- [Material Symbols](https://fonts.google.com/icons) - 圖標字體

---

⭐ 如果這個專案對您有幫助，請給我一個 Star！
