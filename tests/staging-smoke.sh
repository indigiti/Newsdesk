#!/usr/bin/env bash
set -euo pipefail
root=$(mktemp -d)
fixture_pid=
php_pid=
cleanup() {
  if [[ -n $fixture_pid ]]; then kill "$fixture_pid" 2>/dev/null || true; fi
  if [[ -n $php_pid ]]; then kill "$php_pid" 2>/dev/null || true; fi
  rm -rf "$root"
}
trap cleanup EXIT
mkdir -p "$root"/{feeds,public_html,private_html/newsdesk/storage}
cp -a release/public "$root/public_html/newsdesk"
cp -a release/private/. "$root/private_html/newsdesk/"
jq -e '.schema == "DIGIOPS-RELEASE/1" and .public == "public" and .private == "private" and .persistentPaths == ["storage/"]' release/RELEASE.json
cmp release/RELEASE.json "$root/private_html/newsdesk/build/release.json"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=127.0.0.1' \
  -addext 'subjectAltName=IP:127.0.0.1' -keyout "$root/key.pem" -out "$root/cert.pem" 2>/dev/null
cat >"$root/private_html/newsdesk/storage/feeds.json" <<'EOF'
[
  {"name":"Publisher A","url":"https://127.0.0.1:9443/a.xml"},
  {"name":"Publisher B","url":"https://127.0.0.1:9443/b.xml"}
]
EOF
feed() {
  printf '<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture</title><link>https://example.org/</link><description>Fixture</description><item><title>%s</title><link>https://example.org/%s</link><pubDate>Mon, 16 Nov 2026 04:00:00 GMT</pubDate></item></channel></rss>\n' "$2" "$3" >"$root/feeds/$1.xml"
}
feed a 'Central bank holds rates' a
feed b 'CENTRAL BANK HOLDS RATES' b
python3 tests/fixture-server.py "$root/feeds" "$root/cert.pem" "$root/key.pem" &
fixture_pid=$!
NO_PROXY=127.0.0.1 no_proxy=127.0.0.1 php -d "curl.cainfo=$root/cert.pem" -S 127.0.0.1:8080 -t "$root/public_html" &
php_pid=$!
curl -fsS --noproxy '*' --retry 10 --retry-connrefused --retry-delay 1 --cacert "$root/cert.pem" https://127.0.0.1:9443/a.xml >/dev/null
storage="$root/private_html/newsdesk/storage"
api=http://127.0.0.1:8080/newsdesk/api/stories.php
mv "$storage/feeds.json" "$root/config.json"
curl -fsS --noproxy '*' --retry 10 --retry-connrefused --retry-delay 1 "$api" | jq -e '.updated_at == null and .refresh_status == "feeds_not_configured"'
mv "$root/config.json" "$storage/feeds.json"
# First browser visit must create the snapshot without CLI or cron.
node tests/staging-browser.mjs 'Central bank holds rates' 'Publisher B' 'Governor announces follow-up'
curl -fsS http://127.0.0.1:8080/newsdesk/api/stories.php | jq -e '(.stories | length) == 1 and (.stories[0].articles | length) == 2'
node tests/staging-browser.mjs 'Central bank holds rates' 'Publisher B' 'Governor announces follow-up'
feed b 'Governor announces follow-up' follow-up
curl -fsS -D "$root/fresh.headers" "$api" | jq -e '(.stories | length) == 1'
grep -Eiq '^X-NewsDesk-Refresh: fresh' "$root/fresh.headers"
touch -d '10 minutes ago' "$storage/stories.json" "$storage/refresh-attempt"
curl -fsS http://127.0.0.1:8080/newsdesk/api/stories.php | jq -e '(.stories | length) == 2'
node tests/staging-browser.mjs 'Governor announces follow-up' 'Publisher B'
cp "$root/private_html/newsdesk/storage/stories.json" "$root/before.json"
rm "$root/feeds/b.xml"
touch -d '10 minutes ago' "$storage/stories.json" "$storage/refresh-attempt"
curl -fsS -D "$root/failed.headers" "$api" > "$root/after.json"
grep -Eiq '^X-NewsDesk-Refresh: refresh_failed' "$root/failed.headers"
curl -fsS -D "$root/cooldown.headers" "$api" >/dev/null
grep -Eiq '^X-NewsDesk-Refresh: retry_cooldown' "$root/cooldown.headers"
cmp "$root/before.json" "$root/after.json"
# PHP's dev server can return index.html for missing paths. Verify the
# response is a fallback page (or a 404), never the private snapshot.
[[ ! -e "$root/public_html/private_html" ]]
code=$(curl -sS -D "$root/direct.headers" -o "$root/direct.body" -w '%{http_code}' http://127.0.0.1:8080/private_html/newsdesk/storage/stories.json)
if grep -Fiq 'Governor announces follow-up' "$root/direct.body"; then
  echo 'Private snapshot content was exposed' >&2
  exit 1
fi
if [[ $code != 404 ]]; then
  [[ $code == 200 ]]
  grep -Eiq '^Content-Type: text/html' "$root/direct.headers"
  cmp "$root/public_html/newsdesk/index.html" "$root/direct.body"
fi
echo 'Private snapshot is not directly served'
