<?php
// 設置頭部允許跨域請求
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 基礎目錄，限制只能訪問 assets 目錄
$baseDir = '../assets/';

// 獲取請求的路徑
$requestedPath = isset($_GET['path']) ? $_GET['path'] : '';

// 安全檢查：確保路徑以 assets/ 開頭且不包含 ..
if (!preg_match('/^assets\//', $requestedPath) || strpos($requestedPath, '..') !== false) {
    echo json_encode([
        'success' => false,
        'message' => '無效的路徑',
        'folders' => [],
        'files' => []
    ]);
    exit;
}

// 將請求路徑轉換為實際的服務器路徑
$serverPath = str_replace('assets/', $baseDir, $requestedPath);

// 檢查路徑是否存在
if (!file_exists($serverPath) || !is_dir($serverPath)) {
    echo json_encode([
        'success' => false,
        'message' => '目錄不存在',
        'folders' => [],
        'files' => []
    ]);
    exit;
}

// 獲取目錄內容
$folders = [];
$files = [];

$items = scandir($serverPath);
foreach ($items as $item) {
    if ($item === '.' || $item === '..') {
        continue;
    }
    
    $fullPath = $serverPath . '/' . $item;
    if (is_dir($fullPath)) {
        $folders[] = $item;
    } else {
        $files[] = $item;
    }
}

// 返回 JSON 格式的目錄內容
echo json_encode([
    'success' => true,
    'folders' => $folders,
    'files' => $files
]);
?>