<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$path = dirname(__DIR__, 3).'/private_html/newsdesk/storage/stories.json';
if (!is_file($path)) { echo '{"updated_at":null,"stories":[]}'; exit; }
$json = @file_get_contents($path);
if ($json === false) { http_response_code(503); echo '{"error":"Snapshot unavailable"}'; exit; }
echo $json;
