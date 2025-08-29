/**
 * Material 3 主題切換工具
 * 版本: 1.0.0
 * 作者: oldcookie
 * 描述: 統一的主題切換功能，支持手動切換和系統偏好
 */

class Material3ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.init();
    }

    /**
     * 初始化主題管理器
     */
    init() {
        this.applyTheme(this.currentTheme);
        this.createThemeToggleButton();
        this.setupEventListeners();
    }

    /**
     * 獲取儲存的主題設定
     */
    getStoredTheme() {
        return localStorage.getItem('material3-theme');
    }

    /**
     * 獲取系統主題偏好
     */
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /**
     * 應用主題
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        localStorage.setItem('material3-theme', theme);
        this.updateThemeButton();
    }

    /**
     * 切換主題
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    /**
     * 創建主題切換按鈕
     */
    createThemeToggleButton() {
        // 首先檢查是否已有 Material Web Components 按鈕
        const existingMdButton = document.getElementById('theme-toggle');
        if (existingMdButton) {
            this.themeButton = existingMdButton;
            this.updateThemeButton();
            return;
        }

        // 檢查是否已有傳統按鈕
        const existingButton = document.getElementById('theme-toggle-btn');
        if (existingButton) {
            this.themeButton = existingButton;
            return;
        }

        // 創建新的傳統按鈕
        this.themeButton = document.createElement('button');
        this.themeButton.id = 'theme-toggle-btn';
        this.themeButton.className = 'md-theme-toggle';
        this.themeButton.setAttribute('aria-label', '切換主題');
        this.themeButton.innerHTML = '<span class="material-symbols-outlined">light_mode</span>';

        // 如果存在 header，則插入到其中
        const header = document.querySelector('header');
        if (header) {
            const headerControls = header.querySelector('.header-controls') ||
                this.createHeaderControls();
            headerControls.appendChild(this.themeButton);
        }
    }

    /**
     * 創建 header 控制區域
     */
    createHeaderControls() {
        const headerControls = document.createElement('div');
        headerControls.className = 'header-controls';
        headerControls.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            display: flex;
            gap: 8px;
            z-index: 10;
        `;

        const header = document.querySelector('header');
        if (header) {
            header.style.position = 'relative';
            header.appendChild(headerControls);
        }

        return headerControls;
    }

    /**
     * 更新主題按鈕圖標
     */
    updateThemeButton() {
        if (!this.themeButton) return;

        // 處理 Material Web Components 按鈕
        if (this.themeButton.tagName === 'MD-ICON-BUTTON') {
            const icon = this.themeButton.querySelector('md-icon');
            if (icon) {
                icon.textContent = this.currentTheme === 'light' ? 'dark_mode' : 'light_mode';
            }
        } else {
            // 處理傳統按鈕
            const icon = this.themeButton.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = this.currentTheme === 'light' ? 'dark_mode' : 'light_mode';
            }
        }

        this.themeButton.setAttribute('title',
            this.currentTheme === 'light' ? '切換到深色模式' : '切換到淺色模式'
        );
    }

    /**
     * 設置事件監聽器
     */
    setupEventListeners() {
        // 主題切換按鈕事件
        if (this.themeButton) {
            this.themeButton.addEventListener('click', () => this.toggleTheme());
        }

        // 監聽系統主題變化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!this.getStoredTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });

        // 鍵盤快捷鍵 (Ctrl/Cmd + Shift + D)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    /**
     * 獲取當前主題
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 重置為系統主題
     */
    resetToSystemTheme() {
        localStorage.removeItem('material3-theme');
        this.applyTheme(this.getSystemTheme());
    }
}

// 自動初始化主題管理器
let themeManager;

// 確保 DOM 載入完成後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeManager = new Material3ThemeManager();
    });
} else {
    themeManager = new Material3ThemeManager();
}

// 導出供外部使用
window.Material3ThemeManager = Material3ThemeManager;
window.themeManager = themeManager;

// CSS 樣式
const themeToggleStyles = `
.md-theme-toggle {
    background: none;
    border: none;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    padding: 8px;
    border-radius: var(--md-sys-shape-corner-full);
    background-color: var(--md-sys-color-surface-container);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    transition: all var(--md-sys-motion-duration-short4) var(--md-sys-motion-easing-standard);
    user-select: none;
}

.md-theme-toggle:hover {
    background-color: var(--md-sys-color-surface-container-high);
    color: var(--md-sys-color-on-surface);
    transform: scale(1.1);
}

.md-theme-toggle:active {
    transform: scale(0.95);
}

.md-theme-toggle .material-symbols-outlined {
    font-size: 20px;
}

@media (max-width: 600px) {
    .header-controls {
        position: relative !important;
        top: auto !important;
        right: auto !important;
        margin-bottom: 16px;
        justify-content: center;
    }
}
`;

// 注入樣式
const styleSheet = document.createElement('style');
styleSheet.textContent = themeToggleStyles;
document.head.appendChild(styleSheet);
