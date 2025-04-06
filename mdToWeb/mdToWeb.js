document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const previewContainer = document.getElementById('preview-container');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeToggleBtn.querySelector('i');
    const fileList = document.getElementById('file-list');
    const currentPathEl = document.getElementById('current-path');
    const goUpBtn = document.getElementById('go-up-btn');
    
    // 當前路徑和檔案
    let currentPath = 'assets/';
    let currentFile = '';
    let currentMdContent = '';
    
    // 初始化
    init();
    
    // 初始化函數
    function init() {
        // 設置主題
        initTheme();
        
        // 加載文件列表
        loadFileList(currentPath);
        
        // 事件監聽器
        themeToggleBtn.addEventListener('click', toggleTheme);
        goUpBtn.addEventListener('click', navigateUp);
    }
    
    // 主題初始化
    function initTheme() {
        // 檢查用戶首選主題
        const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
        const storedTheme = localStorage.getItem('theme');
        
        if (storedTheme === 'dark' || (!storedTheme && prefersDarkScheme.matches)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            // 啟用暗色代碼高亮主題
            document.getElementById('light-theme-highlight').disabled = true;
            document.getElementById('dark-theme-highlight').disabled = false;
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            // 啟用亮色代碼高亮主題
            document.getElementById('light-theme-highlight').disabled = false;
            document.getElementById('dark-theme-highlight').disabled = true;
        }
    }
    
    // 切換主題
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            // 切換到亮色代碼高亮主題
            document.getElementById('light-theme-highlight').disabled = false;
            document.getElementById('dark-theme-highlight').disabled = true;
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            // 切換到暗色代碼高亮主題
            document.getElementById('light-theme-highlight').disabled = true;
            document.getElementById('dark-theme-highlight').disabled = false;
        }
    }
    
    // 加載文件列表
    function loadFileList(path) {
        currentPathEl.textContent = path;
        fileList.innerHTML = '<div class="loading">正在載入檔案清單...</div>';
        
        // 使用 fetch 直接獲取真實目錄內容
        fetch(`${path}?_=${new Date().getTime()}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法獲取目錄內容');
                }
                return response.text();
            })
            .then(html => {
                // 解析目錄列表
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const links = Array.from(doc.querySelectorAll('a'));
                
                // 提取目錄和文件
                const folders = [];
                const files = [];
                
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    // 跳過父目錄連結
                    if (href === '../' || href === '..') return;
                    
                    if (href.endsWith('/')) {
                        // 目錄
                        folders.push(href.slice(0, -1));
                    } else if (href.endsWith('.md')) {
                        // Markdown 文件
                        files.push(href);
                    }
                });
                
                renderFileList(path, folders, files);
            })
            .catch(error => {
                console.error('Error:', error);
                fileList.innerHTML = `<div class="loading">錯誤: ${error.message}</div>`;
                
                // 如果無法獲取目錄，顯示默認文件
                if (path === 'assets/') {
                    renderFileList(path, [], ['demo.md']);
                }
            });
    }
    
    // 渲染文件列表
    function renderFileList(path, folders, files) {
        fileList.innerHTML = '';
        
        // 如果不是根目錄，添加返回上一層項
        if (path !== 'assets/') {
            const upItem = document.createElement('div');
            upItem.className = 'file-item folder';
            upItem.innerHTML = '<i class="fas fa-level-up-alt"></i> 上一層';
            upItem.addEventListener('click', navigateUp);
            fileList.appendChild(upItem);
        }
        
        // 先顯示目錄
        folders.forEach(folder => {
            const folderItem = document.createElement('div');
            folderItem.className = 'file-item folder';
            folderItem.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;
            folderItem.addEventListener('click', () => {
                navigateTo(`${path}${folder}/`);
            });
            fileList.appendChild(folderItem);
        });
        
        // 再顯示 Markdown 文件 - 只顯示文件名而不是完整路徑
        files.forEach(file => {
            if (file.endsWith('.md')) {
                const folderItem = document.createElement('div');
                folderItem.className = 'file-item markdown';
                // 只顯示文件名，不顯示完整路徑
                folderItem.innerHTML = `<i class="fas fa-file-alt"></i> ${file}`;
                folderItem.addEventListener('click', () => {
                    loadMarkdownFile(`${path}${file}`);
                });
                fileList.appendChild(folderItem);
            }
        });
        
        // 如果目錄為空
        if (folders.length === 0 && files.length === 0) {
            fileList.innerHTML = '<div class="loading">此目錄為空</div>';
        }
    }
    
    // 導航到指定目錄
    function navigateTo(path) {
        // 限制只能瀏覽 assets 目錄及其子目錄
        if (!path.startsWith('assets/')) {
            path = 'assets/';
        }
        
        currentPath = path;
        loadFileList(path);
    }
    
    // 導航到上一層目錄
    function navigateUp() {
        if (currentPath === 'assets/') return;
        
        // 移除最後一個目錄
        const pathParts = currentPath.split('/');
        pathParts.pop(); // 移除空字符串
        pathParts.pop(); // 移除當前目錄
        let newPath = pathParts.join('/') + '/';
        
        if (newPath === '' || !newPath.startsWith('assets/')) {
            newPath = 'assets/';
        }
        navigateTo(newPath);
    }
    
    // 加載 Markdown 文件
    function loadMarkdownFile(filePath) {
        currentFile = filePath;
        
        // 使用 fetch 獲取文件內容
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法獲取文件內容');
                }
                return response.text();
            })
            .then(content => {
                currentMdContent = content;
                convertMarkdown();
            })
            .catch(error => {
                console.error('Error:', error);
                currentMdContent = `# 錯誤\n\n無法載入文件: ${error.message}`;
                convertMarkdown();
            });
    }
    
    // 轉換 Markdown 為 HTML
    function convertMarkdown() {
        if (!currentMdContent.trim()) {
            previewContainer.innerHTML = '<div class="empty-preview">請從檔案列表選擇 Markdown 文件...</div>';
            return;
        }
        
        // 設置 marked 選項
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            highlight: function(code, lang) {
                // 處理語言別名
                if (lang === 'js') lang = 'javascript';
                if (lang === 'py') lang = 'python';
                if (lang === 'html') lang = 'xml';
                
                // 只支持指定的語言：Python、JavaScript、Java、JSON、XML、Markdown、Dart、Swift
                const supportedLanguages = ['python', 'javascript', 'java', 'json', 'xml', 'markdown', 'dart', 'swift'];
                
                // 如果有指定語言且該語言在支援列表中
                if (lang && supportedLanguages.includes(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
                    } catch (error) {
                        console.error('Highlight error:', error);
                    }
                }
                
                // 如果無指定語言或不在支援列表中，嘗試檢測是否為支援的語言
                try {
                    const result = hljs.highlightAuto(code, supportedLanguages);
                    if (result.relevance > 5) {
                        return result.value;
                    }
                } catch (error) {
                    console.error('Auto highlight error:', error);
                }
                
                // 最後回退到純文本
                return hljs.highlight(code, { language: 'plaintext' }).value;
            }
        });
        
        // 轉換 Markdown 為 HTML
        const htmlContent = marked.parse(currentMdContent);
        previewContainer.innerHTML = htmlContent;
        
        // 應用圖片路徑修正
        fixImagePaths();
        
        // 為代碼塊添加語言標籤
        addCodeLanguageLabels();
    }
    
    // 為代碼塊添加語言標籤
    function addCodeLanguageLabels() {
        const codeBlocks = previewContainer.querySelectorAll('pre code');
        codeBlocks.forEach(codeBlock => {
            // 獲取代碼塊的語言
            const classes = codeBlock.className.split(' ');
            let language = '';
            
            for (const cls of classes) {
                if (cls.startsWith('language-')) {
                    language = cls.replace('language-', '');
                    break;
                }
            }
            
            // 獲取人類可讀的語言名稱
            let languageName = '';
            switch (language) {
                case 'javascript': languageName = 'JavaScript'; break;
                case 'python': languageName = 'Python'; break;
                case 'java': languageName = 'Java'; break;
                case 'json': languageName = 'JSON'; break;
                case 'xml': languageName = 'XML/HTML'; break;
                case 'markdown': languageName = 'Markdown'; break;
                case 'dart': languageName = 'Dart'; break;
                case 'swift': languageName = 'Swift'; break;
                case 'plaintext': languageName = 'Text'; break;
                default: languageName = language ? language.charAt(0).toUpperCase() + language.slice(1) : '';
            }
            
            // 如果識別出語言，添加語言標籤
            if (languageName) {
                const pre = codeBlock.parentElement;
                const wrapper = document.createElement('div');
                wrapper.className = 'code-block-wrapper';
                
                const languageLabel = document.createElement('div');
                languageLabel.className = 'code-language-label';
                languageLabel.textContent = languageName;
                
                // 克隆 pre 元素，將其移入包裝器
                pre.parentNode.insertBefore(wrapper, pre);
                wrapper.appendChild(languageLabel);
                wrapper.appendChild(pre);
            }
        });
    }
    
    // 修正圖片路徑
    function fixImagePaths() {
        const images = previewContainer.querySelectorAll('img');
        images.forEach(img => {
            const src = img.getAttribute('src');
            
            // 如果是相對路徑且不是以 http 或 data: 開頭
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                // 根據當前文件路徑修正圖片路徑
                if (currentFile) {
                    const filePath = currentFile.split('/');
                    filePath.pop(); // 移除文件名
                    const dirPath = filePath.join('/');
                    img.src = `${dirPath}/${src}`;
                }
            }
        });
    }
    
    // 從 Markdown 提取標題
    function extractTitle(markdown) {
        const match = markdown.match(/^# (.*?)$/m);
        return match ? match[1].trim() : '';
    }
});