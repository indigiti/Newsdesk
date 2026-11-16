<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__.'/refresh.php';
$dir = $argv[1] ?? '';
if ($dir === '' || !is_dir($dir)) { fwrite(STDERR, "Usage: php ingest.php /absolute/newsdesk-storage\n"); exit(1); }
try {
    $result = newsdeskRefresh($dir, false);
    if ($result !== 'refreshed') { fwrite(STDERR, $result.PHP_EOL); exit(1); }
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage().PHP_EOL);
    exit(1);
}
