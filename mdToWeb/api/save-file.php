<?php
// 設置頭部允許跨域請求
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 處理 OPTIONS 請求（預檢請求）
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// 確保請求方法為 POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'message' => '僅支持 POST 請求'
    ]);
    exit;
}

// 基礎目錄，限制只能訪問 assets 目錄
$baseDir = '../assets/';

// 獲取 POST 請求的 JSON 數據
$postData = json_decode(file_get_contents('php://input'), true);

// 檢查請求數據
if (!isset($postData['path']) || !isset($postData['content'])) {
    echo json_encode([
        'success' => false,
        'message' => '缺少必要參數'
    ]);
    exit;
}

$requestedPath = $postData['path'];
$content = $postData['content'];

// 安全檢查：確保路徑以 assets/ 開頭且不包含 ..
if (!preg_match('/^assets\//', $requestedPath) || strpos($requestedPath, '..') !== false) {
    echo json_encode([
        'success' => false,
        'message' => '無效的文件路徑'
    ]);
    exit;
}

// 將請求路徑轉換為實際的服務器路徑
$serverPath = str_replace('assets/', $baseDir, $requestedPath);

// 檢查路徑是否在 assets 目錄內
$realBaseDir = realpath($baseDir);
$realServerPath = realpath(dirname($serverPath));

// 如果目錄不存在，嘗試創建
if (!$realServerPath && !file_exists(dirname($serverPath))) {
    mkdir(dirname($serverPath), 0777, true);
    $realServerPath = realpath(dirname($serverPath));
}

if ($realServerPath === false || strpos($realServerPath, $realBaseDir) !== 0) {
    echo json_encode([
        'success' => false,
        'message' => '無效的文件路徑'
    ]);
    exit;
}

// 檢查文件擴展名是否為 .md
$extension = pathinfo($serverPath, PATHINFO_EXTENSION);
if (strtolower($extension) !== 'md') {
    echo json_encode([
        'success' => false,
        'message' => '僅支持 Markdown 文件'
    ]);
    exit;
}

// 寫入文件
if (file_put_contents($serverPath, $content) !== false) {
    echo json_encode([
        'success' => true,
        'message' => '文件保存成功'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => '文件保存失敗'
    ]);
}
?>