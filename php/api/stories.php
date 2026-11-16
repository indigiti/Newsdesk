<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo '{"error":"Method not allowed"}';
    exit;
}
$private = dirname(__DIR__, 3).'/private_html/newsdesk';
$dir = $private.'/storage';
try {
    require_once $private.'/bin/refresh.php';
    $status = newsdeskRefresh($dir, true);
} catch (Throwable $error) {
    error_log('NewsDesk: feed refresh failed');
    $status = 'refresh_failed';
}
header('X-NewsDesk-Refresh: '.$status);
$path = $dir.'/stories.json';
clearstatcache(true, $path);
if (!is_file($path)) {
    echo json_encode(['updated_at'=>null,'stories'=>[],'refresh_status'=>$status], JSON_THROW_ON_ERROR);
    exit;
}
$json = @file_get_contents($path);
if ($json === false) { http_response_code(503); echo '{"error":"Snapshot unavailable"}'; exit; }
echo $json;
