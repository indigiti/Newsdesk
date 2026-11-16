<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$dir = $argv[1] ?? '';
if ($dir === '' || !is_dir($dir)) { fwrite(STDERR, "Usage: php ingest.php /absolute/newsdesk-private\n"); exit(1); }
$lock = fopen($dir.'/ingest.lock','c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) exit(1);
$config = json_decode(file_get_contents($dir.'/feeds.json'), true, 512, JSON_THROW_ON_ERROR);
$groups=[]; $seen=[]; $ok=0;
foreach ($config as $feed) {
    $url=$feed['url'];
    if (parse_url($url, PHP_URL_SCHEME)!=='https') continue;
    $ch=curl_init($url);
    $body='';
    curl_setopt_array($ch,[CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_TIMEOUT=>12,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_FAILONERROR=>true,CURLOPT_WRITEFUNCTION=>function($ch,$chunk)use(&$body){if(strlen($body)+strlen($chunk)>2000000)return 0;$body.=$chunk;return strlen($chunk);}]);
    if (!curl_exec($ch) || curl_getinfo($ch,CURLINFO_RESPONSE_CODE)!==200) { fwrite(STDERR,"Feed request failed\n"); continue; }
    $xml=@simplexml_load_string($body, 'SimpleXMLElement', LIBXML_NONET | LIBXML_NOCDATA);
    if (!$xml || !isset($xml->channel)) { fwrite(STDERR,"Invalid or unsupported RSS feed\n"); continue; }
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
if (!$ok || $ok !== count($config)) { fwrite(STDERR,"Not all feeds succeeded; keeping prior snapshot\n"); exit(1); }
usort($groups,fn($a,$b)=>$b['time']<=>$a['time']);
$json=json_encode(['updated_at'=>gmdate(DATE_ATOM),'stories'=>array_slice($groups,0,250)],JSON_THROW_ON_ERROR|JSON_INVALID_UTF8_SUBSTITUTE);
$tmp=tempnam($dir,'snapshot-');
if ($tmp===false || file_put_contents($tmp,$json)!==strlen($json) || !chmod($tmp,0640) || !rename($tmp,$dir.'/stories.json')) { if ($tmp) @unlink($tmp); exit(1); }
