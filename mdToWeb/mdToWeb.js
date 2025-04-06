document.addEventListener('DOMContentLoaded', function() {
    // DOM 元素
    const mdInput = document.getElementById('md-input');
    const convertBtn = document.getElementById('convert-btn');
    const previewContainer = document.getElementById('preview-container');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = themeToggleBtn.querySelector('i');
    const fileList = document.getElementById('file-list');
    const currentPathEl = document.getElementById('current-path');
    const goUpBtn = document.getElementById('go-up-btn');
    const saveMdBtn = document.getElementById('save-md-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');
    
    // 當前路徑
    let currentPath = 'assets/';
    let currentFile = '';
    
    // 初始化
    init();
    
    // 初始化函數
    function init() {
        // 設置主題
        initTheme();
        
        // 加載文件列表
        loadFileList(currentPath);
        
        // 事件監聽器
        convertBtn.addEventListener('click', convertMarkdown);
        themeToggleBtn.addEventListener('click', toggleTheme);
        goUpBtn.addEventListener('click', navigateUp);
        saveMdBtn.addEventListener('click', saveMarkdown);
        exportHtmlBtn.addEventListener('click', exportHtml);
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
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
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
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }
    
    // 加載文件列表
    function loadFileList(path) {
        currentPathEl.textContent = path;
        fileList.innerHTML = '<div class="loading">正在載入檔案清單...</div>';
        
        // 使用 fetch 獲取目錄內容
        fetch(`api/list-files.php?path=${encodeURIComponent(path)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法獲取文件列表');
                }
                return response.json();
            })
            .then(data => {
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
                data.folders.forEach(folder => {
                    const folderItem = document.createElement('div');
                    folderItem.className = 'file-item folder';
                    folderItem.innerHTML = `<i class="fas fa-folder"></i> ${folder}`;
                    folderItem.addEventListener('click', () => {
                        navigateTo(`${path}${folder}/`);
                    });
                    fileList.appendChild(folderItem);
                });
                
                // 再顯示 Markdown 文件
                data.files.forEach(file => {
                    if (file.endsWith('.md')) {
                        const fileItem = document.createElement('div');
                        fileItem.className = 'file-item markdown';
                        fileItem.innerHTML = `<i class="fas fa-file-alt"></i> ${file}`;
                        fileItem.addEventListener('click', () => {
                            loadMarkdownFile(`${path}${file}`);
                        });
                        fileList.appendChild(fileItem);
                    }
                });
                
                // 如果目錄為空
                if (data.folders.length === 0 && data.files.length === 0) {
                    fileList.innerHTML = '<div class="loading">此目錄為空</div>';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                fileList.innerHTML = `<div class="loading">錯誤: ${error.message}</div>`;
            });
    }
    
    // 導航到指定目錄
    function navigateTo(path) {
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
        
        if (newPath === '') newPath = 'assets/';
        navigateTo(newPath);
    }
    
    // 加載 Markdown 文件
    function loadMarkdownFile(filePath) {
        currentFile = filePath;
        
        // 使用 fetch 獲取文件內容
        fetch(`api/get-file.php?path=${encodeURIComponent(filePath)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法獲取文件內容');
                }
                return response.text();
            })
            .then(content => {
                mdInput.value = content;
                convertMarkdown();
            })
            .catch(error => {
                console.error('Error:', error);
                mdInput.value = `# 錯誤\n\n無法載入文件: ${error.message}`;
                convertMarkdown();
            });
    }
    
    // 轉換 Markdown 為 HTML
    function convertMarkdown() {
        const mdContent = mdInput.value;
        if (!mdContent.trim()) {
            previewContainer.innerHTML = '<div class="empty-preview">請輸入 Markdown 內容或選擇文件...</div>';
            return;
        }
        
        // 設置 marked 選項
        marked.setOptions({
            breaks: true,
            gfm: true,
            headerIds: true,
            highlight: function(code, lang) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            }
        });
        
        // 轉換 Markdown 為 HTML
        const htmlContent = marked.parse(mdContent);
        previewContainer.innerHTML = htmlContent;
        
        // 應用圖片路徑修正
        fixImagePaths();
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
    
    // 保存 Markdown 文件
    function saveMarkdown() {
        const mdContent = mdInput.value;
        if (!mdContent.trim()) {
            alert('沒有內容可保存！');
            return;
        }
        
        // 如果有當前文件路徑，則保存到該路徑
        if (currentFile) {
            // 使用 fetch 保存文件
            fetch('api/save-file.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    path: currentFile,
                    content: mdContent
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('無法保存文件');
                }
                return response.json();
            })
            .then(result => {
                if (result.success) {
                    alert('文件保存成功！');
                } else {
                    alert(`保存失敗: ${result.message}`);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert(`保存失敗: ${error.message}`);
            });
        } else {
            // 沒有當前文件路徑，提示用戶先選擇文件
            const fileName = prompt('請輸入要保存的文件名 (包含 .md 擴展名):', 'new-file.md');
            if (fileName) {
                if (!fileName.endsWith('.md')) {
                    alert('文件名必須以 .md 結尾！');
                    return;
                }
                
                currentFile = `${currentPath}${fileName}`;
                saveMarkdown();
            }
        }
    }
    
    // 導出 HTML
    function exportHtml() {
        const mdContent = mdInput.value;
        if (!mdContent.trim()) {
            alert('沒有內容可導出！');
            return;
        }
        
        // 創建完整的 HTML 文檔
        const htmlContent = marked.parse(mdContent);
        const title = extractTitle(mdContent) || 'Exported Markdown';
        
        // 獲取當前主題
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        
        // 創建完整 HTML 文檔（包含樣式）
        const fullHtml = `<!DOCTYPE html>
<html lang="zh-TW" data-theme="${currentTheme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f5f7fa;
            --text-primary: #333333;
            --text-secondary: #666666;
            --border-color: #ddd;
            --accent-color: #4a6cf7;
            --code-bg: #f0f0f0;
        }
        
        [data-theme="dark"] {
            --bg-primary: #1a1a1a;
            --bg-secondary: #2a2a2a;
            --text-primary: #e0e0e0;
            --text-secondary: #aaaaaa;
            --border-color: #444;
            --accent-color: #5d7bf9;
            --code-bg: #2d2d2d;
        }
        
        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                --bg-primary: #1a1a1a;
                --bg-secondary: #2a2a2a;
                --text-primary: #e0e0e0;
                --text-secondary: #aaaaaa;
                --border-color: #444;
                --accent-color: #5d7bf9;
                --code-bg: #2d2d2d;
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            background-color: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5rem;
            margin-bottom: 1rem;
            color: var(--text-primary);
        }
        
        h1 { font-size: 2rem; }
        h2 { font-size: 1.75rem; }
        h3 { font-size: 1.5rem; }
        h4 { font-size: 1.25rem; }
        h5 { font-size: 1.1rem; }
        h6 { font-size: 1rem; }
        
        p {
            margin-bottom: 1rem;
        }
        
        pre {
            background-color: var(--code-bg);
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
            margin-bottom: 1rem;
        }
        
        code {
            font-family: 'Consolas', monospace;
            background-color: var(--code-bg);
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
        }
        
        pre code {
            padding: 0;
            background-color: transparent;
        }
        
        blockquote {
            border-left: 4px solid var(--accent-color);
            padding-left: 1rem;
            margin-left: 0;
            margin-bottom: 1rem;
            color: var(--text-secondary);
        }
        
        ul, ol {
            margin-bottom: 1rem;
            padding-left: 2rem;
        }
        
        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 1rem 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1rem;
        }
        
        th, td {
            border: 1px solid var(--border-color);
            padding: 0.5rem;
        }
        
        th {
            background-color: var(--bg-secondary);
        }
        
        a {
            color: var(--accent-color);
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        hr {
            border: 0;
            height: 1px;
            background-color: var(--border-color);
            margin: 2rem 0;
        }
        
        .theme-toggle {
            position: fixed;
            top: 1rem;
            right: 1rem;
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 50%;
            width: 3rem;
            height: 3rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1.5rem;
        }
        
        @media (max-width: 768px) {
            body {
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="content">
        ${htmlContent}
    </div>
    
    <div class="theme-toggle" onclick="toggleTheme()">
        <span id="theme-icon">🌙</span>
    </div>
    
    <script>
        // 主題切換
        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const themeIcon = document.getElementById('theme-icon');
            
            if (currentTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeIcon.textContent = '🌙';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeIcon.textContent = '☀️';
            }
        }
        
        // 初始化主題
        function initTheme() {
            const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
            const storedTheme = localStorage.getItem('theme');
            const themeIcon = document.getElementById('theme-icon');
            
            if (storedTheme === 'dark' || (!storedTheme && prefersDarkScheme.matches)) {
                document.documentElement.setAttribute('data-theme', 'dark');
                themeIcon.textContent = '☀️';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                themeIcon.textContent = '🌙';
            }
        }
        
        // 監聽系統主題變化
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                if (e.matches) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.getElementById('theme-icon').textContent = '☀️';
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                    document.getElementById('theme-icon').textContent = '🌙';
                }
            }
        });
        
        // 初始化
        initTheme();
    </script>
</body>
</html>`;
        
        // 創建下載鏈接
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // 從 Markdown 提取標題
    function extractTitle(markdown) {
        const match = markdown.match(/^# (.*?)$/m);
        return match ? match[1].trim() : '';
    }
});