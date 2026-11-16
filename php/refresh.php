<?php
declare(strict_types=1);

function newsdeskSnapshotFresh(string $snapshot): bool
{
    clearstatcache(true, $snapshot);
    $modified = @filemtime($snapshot);
    return $modified !== false && $modified > time() - 300;
}

function newsdeskRefresh(string $dir, bool $onVisit): string
{
    $snapshot = $dir.'/stories.json';
    if ($onVisit && newsdeskSnapshotFresh($snapshot)) return 'fresh';
    $custom = $dir.'/feeds.json';
    $bundled = !is_file($custom);
    $configPath = $bundled ? dirname(__DIR__).'/config/feeds.default.json' : $custom;
    if (!is_file($configPath)) return 'feeds_not_configured';
    if (!is_dir($dir) && !@mkdir($dir, 0750) && !is_dir($dir)) return 'storage_not_writable';
    if (!is_writable($dir)) return 'storage_not_writable';

    $lock = @fopen($dir.'/ingest.lock', 'c+');
    if ($lock === false) return 'storage_not_writable';
    try {
        if (!flock($lock, LOCK_EX | LOCK_NB)) return 'refresh_in_progress';
        if ($onVisit && newsdeskSnapshotFresh($snapshot)) return 'fresh';
        $attempt = $dir.'/refresh-attempt';
        clearstatcache(true, $attempt);
        $last = @filemtime($attempt);
        if ($onVisit && $last !== false && $last > time() - 60) return 'retry_cooldown';
        if (!@touch($attempt)) return 'storage_not_writable';

        $config = json_decode((string)file_get_contents($configPath, false, null, 0, 65537), true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($config) || !array_is_list($config) || !$config || count($config) > 30) {
            throw new RuntimeException('Configure 1–30 approved RSS feeds');
        }
        foreach ($config as $feed) {
            if (!is_array($feed) || !is_string($feed['name'] ?? null) || trim($feed['name']) === ''
                || !is_string($feed['url'] ?? null) || !filter_var($feed['url'], FILTER_VALIDATE_URL)
                || parse_url($feed['url'], PHP_URL_SCHEME) !== 'https') {
                throw new RuntimeException('Invalid feed configuration');
            }
        }
        $deadline = hrtime(true) + ($onVisit ? 8000000000 : 60000000000);
        $groups=[]; $seen=[]; $ok=0;
        foreach ($config as $feed) {
            $remaining = (int)(($deadline - hrtime(true)) / 1000000);
            if ($remaining <= 0) {
                if ($bundled) break;
                throw new RuntimeException('Feed refresh time limit reached');
            }
            if ($bundled && $onVisit) $remaining = min($remaining, 1450);
            $url=$feed['url'];
            $ch=curl_init($url);
            $body='';
            curl_setopt_array($ch,[CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_CONNECTTIMEOUT_MS=>min(2500,$remaining),CURLOPT_TIMEOUT_MS=>min(12000,$remaining),CURLOPT_FOLLOWLOCATION=>false,CURLOPT_FAILONERROR=>true,CURLOPT_WRITEFUNCTION=>function($ch,$chunk)use(&$body){if(strlen($body)+strlen($chunk)>2000000)return 0;$body.=$chunk;return strlen($chunk);}]);
            if (!curl_exec($ch) || curl_getinfo($ch,CURLINFO_RESPONSE_CODE)!==200) {
                if ($bundled) continue;
                throw new RuntimeException('Feed request failed');
            }
            $xml=@simplexml_load_string($body, 'SimpleXMLElement', LIBXML_NONET | LIBXML_NOCDATA);
            if (!$xml || !isset($xml->channel)) {
                if ($bundled) continue;
                throw new RuntimeException('Invalid or unsupported RSS feed');
            }
            $ok++;
            foreach ($xml->channel->item as $item) {
                $title=trim(strip_tags((string)$item->title)); $link=trim((string)$item->link);
                if ($title==='' || !filter_var($link,FILTER_VALIDATE_URL) || !in_array(parse_url($link,PHP_URL_SCHEME),['http','https'],true) || isset($seen[$link])) continue;
                $seen[$link]=true;
                $key=hash('sha256',mb_strtolower(preg_replace('/\s+/u',' ',$title) ?? $title,'UTF-8'));
                $time=strtotime((string)$item->pubDate) ?: 0;
                $groups[$key] ??= ['id'=>$key,'title'=>$title,'time'=>0,'articles'=>[]];
                $groups[$key]['time']=max($groups[$key]['time'],$time);
                $groups[$key]['articles'][]=['title'=>$title,'url'=>$link,'source'=>$feed['name']];
            }
        }
        if (!$ok || ($bundled && !$groups) || (!$bundled && $ok !== count($config))) { throw new RuntimeException('Not all feeds succeeded'); }
        usort($groups,fn($a,$b)=>$b['time']<=>$a['time']);
        $json=json_encode(['updated_at'=>gmdate(DATE_ATOM),'stories'=>array_slice($groups,0,250)],JSON_THROW_ON_ERROR|JSON_INVALID_UTF8_SUBSTITUTE);
        $tmp=tempnam($dir,'snapshot-');
        if ($tmp===false || file_put_contents($tmp,$json)!==strlen($json) || !chmod($tmp,0640) || !rename($tmp,$dir.'/stories.json')) { if ($tmp) @unlink($tmp); throw new RuntimeException('Snapshot write failed'); }
        return 'refreshed';
    } finally {
        fclose($lock);
    }
}
