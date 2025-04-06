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
    
    // 版本號，用於緩存破壞
    const version = new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(Math.random() * 100);
    
    // 初始化
    init();
    
    // 初始化函數
    function init() {
        // 設置主題
        initTheme();
        
        // 檢查 URL 參數是否指定了需要打開的文件
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');
        const pathParam = urlParams.get('path');
        
        // 如果 URL 中指定了路徑，則先設置當前路徑
        if (pathParam) {
            currentPath = decodeURIComponent(pathParam);
            // 確保路徑以斜線結尾
            if (!currentPath.endsWith('/')) {
                currentPath += '/';
            }
            // 確保路徑格式正確
            if (!currentPath.startsWith('assets/')) {
                currentPath = 'assets/';
            }
        }
        
        // 加載文件列表
        loadFileList(currentPath).then(() => {
            // 如果 URL 中指定了文件，則在加載文件列表後打開該文件
            if (fileParam) {
                const fileToOpen = decodeURIComponent(fileParam);
                if (fileToOpen.endsWith('.md')) {
                    loadMarkdownFile(`${currentPath}${fileToOpen}`);
                }
            }
        });
        
        // 事件監聽器
        themeToggleBtn.addEventListener('click', toggleTheme);
        goUpBtn.addEventListener('click', navigateUp);
        
        // 監聽瀏覽器的前進後退操作
        window.addEventListener('popstate', handlePopState);
    }
    
    // 處理瀏覽器的前進後退操作
    function handlePopState(event) {
        const urlParams = new URLSearchParams(window.location.search);
        const fileParam = urlParams.get('file');
        const pathParam = urlParams.get('path');
        
        // 檢查是否有路徑參數
        if (pathParam) {
            currentPath = decodeURIComponent(pathParam);
            if (!currentPath.endsWith('/')) {
                currentPath += '/';
            }
            if (!currentPath.startsWith('assets/')) {
                currentPath = 'assets/';
            }
            
            // 加載文件列表
            loadFileList(currentPath).then(() => {
                // 如果有文件參數，則打開該文件
                if (fileParam) {
                    const fileToOpen = decodeURIComponent(fileParam);
                    if (fileToOpen.endsWith('.md')) {
                        loadMarkdownFile(`${currentPath}${fileToOpen}`, false);
                    }
                }
            });
        } else {
            // 如果沒有路徑參數，則回到默認路徑
            currentPath = 'assets/';
            loadFileList(currentPath);
        }
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
        
        // 使用 Promise 包裝，以便在完成後執行後續操作
        return new Promise((resolve, reject) => {
            // 從 JSON 檔案載入檔案列表數據
            fetch(`assets/filelist.json?v=${version}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('無法獲取檔案列表數據');
                    }
                    return response.json();
                })
                .then(data => {
                    // 檢查JSON中是否包含當前路徑的數據
                    if (data[path]) {
                        const { folders, files } = data[path];
                        renderFileList(path, folders, files);
                    } else {
                        // 如果找不到路徑，則回到根目錄
                        if (path !== 'assets/') {
                            currentPath = 'assets/';
                            currentPathEl.textContent = currentPath;
                            updateUrlParams(null, currentPath);
                            
                            if (data['assets/']) {
                                const { folders, files } = data['assets/'];
                                renderFileList('assets/', folders, files);
                            } else {
                                // 如果連根目錄數據都找不到，顯示錯誤
                                fileList.innerHTML = '<div class="loading">錯誤: 找不到檔案列表數據</div>';
                            }
                        } else {
                            // 如果是根目錄但找不到數據，顯示錯誤
                            fileList.innerHTML = '<div class="loading">錯誤: 找不到檔案列表數據</div>';
                        }
                    }
                    resolve();
                })
                .catch(error => {
                    console.error('Error:', error);
                    fileList.innerHTML = `<div class="loading">錯誤: ${error.message}</div>`;
                    
                    // 如果完全無法載入JSON，顯示默認檔案列表
                    if (path === 'assets/') {
                        const defaultFiles = [
                            'demo.md',
                            'EA 範例.md',
                            'EA Practice 1.md',
                            'Press Release Sample.md'
                        ];
                        renderFileList(path, [], defaultFiles);
                    }
                    resolve();
                });
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
        
        // 再顯示 Markdown 文件 - 只顯示文件名而不是完整路徑，且隱藏 .md 副檔名
        files.forEach(file => {
            if (file.endsWith('.md')) {
                const folderItem = document.createElement('div');
                folderItem.className = 'file-item markdown';
                // 只顯示文件名，不顯示副檔名
                const displayName = file.replace(/\.md$/, '');
                folderItem.innerHTML = `<i class="fas fa-file-alt"></i> ${displayName}`;
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
        
        // 更新 URL 參數
        updateUrlParams(null, path);
        
        // 加載文件列表
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
    function loadMarkdownFile(filePath, updateUrl = true) {
        currentFile = filePath;
        
        // 如果需要更新 URL
        if (updateUrl) {
            // 從文件路徑中提取路徑和文件名
            const pathParts = filePath.split('/');
            const fileName = pathParts.pop();
            const path = pathParts.join('/') + '/';
            
            // 更新 URL 參數
            updateUrlParams(fileName, path);
        }
        
        // 使用 fetch 獲取文件內容，添加緩存破壞參數
        fetch(`${filePath}?v=${version}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法獲取文件內容');
                }
                return response.text();
            })
            .then(content => {
                currentMdContent = content;
                convertMarkdown();
                
                // 更新頁面標題
                const title = extractTitle(content);
                if (title) {
                    document.title = `${title} - Markdown to Web`;
                } else {
                    // 如果沒有提取到標題，則使用文件名作為標題
                    const fileName = filePath.split('/').pop();
                    document.title = `${fileName} - Markdown to Web`;
                }
            })
            .catch(error => {
                console.error('Error:', error);
                currentMdContent = `# 錯誤\n\n無法載入文件: ${error.message}`;
                convertMarkdown();
                document.title = `錯誤 - Markdown to Web`;
            });
    }
    
    // 更新 URL 參數
    function updateUrlParams(file, path) {
        // 創建新的 URL 參數
        const urlParams = new URLSearchParams();
        
        // 如果有文件，則添加文件參數
        if (file) {
            urlParams.set('file', file);
        }
        
        // 如果有路徑，則添加路徑參數
        if (path) {
            // 移除路徑結尾的斜線以簡化 URL
            const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
            urlParams.set('path', cleanPath);
        }
        
        // 構建新的 URL
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        
        // 使用 History API 更新 URL，不重新加載頁面
        window.history.pushState({ file, path }, '', newUrl);
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
                // 根據當前文件路徑修正圖片路徑，添加緩存破壞參數
                if (currentFile) {
                    const filePath = currentFile.split('/');
                    filePath.pop(); // 移除文件名
                    const dirPath = filePath.join('/');
                    img.src = `${dirPath}/${src}?v=${version}`;
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