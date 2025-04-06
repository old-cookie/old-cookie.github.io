<?php
// 設置頭部允許跨域請求
header('Content-Type: text/plain; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 基礎目錄，限制只能訪問 assets 目錄
$baseDir = '../assets/';

// 獲取請求的路徑
$requestedPath = isset($_GET['path']) ? $_GET['path'] : '';

// 安全檢查：確保路徑以 assets/ 開頭且不包含 ..
if (!preg_match('/^assets\//', $requestedPath) || strpos($requestedPath, '..') !== false) {
    echo "錯誤：無效的文件路徑";
    exit;
}

// 將請求路徑轉換為實際的服務器路徑
$serverPath = str_replace('assets/', $baseDir, $requestedPath);

// 檢查文件是否存在
if (!file_exists($serverPath) || is_dir($serverPath)) {
    echo "錯誤：文件不存在";
    exit;
}

// 檢查文件擴展名是否為 .md
$extension = pathinfo($serverPath, PATHINFO_EXTENSION);
if (strtolower($extension) !== 'md') {
    echo "錯誤：僅支持 Markdown 文件";
    exit;
}

// 讀取並返回文件內容
echo file_get_contents($serverPath);
?>