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
mkdir -p "$root"/{feeds,newsdesk-private,public_html/api}
cp -a out/. "$root/public_html/"
cp php/api/stories.php "$root/public_html/api/"
openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=127.0.0.1' \
  -addext 'subjectAltName=IP:127.0.0.1' -keyout "$root/key.pem" -out "$root/cert.pem" 2>/dev/null
cat >"$root/newsdesk-private/feeds.json" <<'EOF'
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
php -S 127.0.0.1:8080 -t "$root/public_html" &
php_pid=$!
curl -fsS --noproxy '*' --retry 10 --retry-connrefused --retry-delay 1 --cacert "$root/cert.pem" https://127.0.0.1:9443/a.xml >/dev/null
curl -fsS --noproxy '*' --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:8080/api/stories.php | jq -e '.updated_at == null and .stories == []'
ingest() { NO_PROXY=127.0.0.1 no_proxy=127.0.0.1 php -d "curl.cainfo=$root/cert.pem" php/ingest.php "$root/newsdesk-private"; }
ingest
curl -fsS http://127.0.0.1:8080/api/stories.php | jq -e '(.stories | length) == 1 and (.stories[0].articles | length) == 2'
node tests/staging-browser.mjs 'Central bank holds rates' 'Publisher B' 'Governor announces follow-up'
feed b 'Governor announces follow-up' follow-up
ingest
curl -fsS http://127.0.0.1:8080/api/stories.php | jq -e '(.stories | length) == 2'
node tests/staging-browser.mjs 'Governor announces follow-up' 'Publisher B'
cp "$root/newsdesk-private/stories.json" "$root/before.json"
rm "$root/feeds/b.xml"
if ingest; then echo 'Expected a failed ingest when the source disappears' >&2; exit 1; fi
curl -fsS http://127.0.0.1:8080/api/stories.php > "$root/after.json"
cmp "$root/before.json" "$root/after.json"
# PHP's dev server can return index.html for missing paths. Verify the
# response is a fallback page (or a 404), never the private snapshot.
[[ ! -e "$root/public_html/newsdesk-private" ]]
code=$(curl -sS -D "$root/direct.headers" -o "$root/direct.body" -w '%{http_code}' http://127.0.0.1:8080/newsdesk-private/stories.json)
if grep -Fiq 'Governor announces follow-up' "$root/direct.body"; then
  echo 'Private snapshot content was exposed' >&2
  exit 1
fi
if [[ $code != 404 ]]; then
  [[ $code == 200 ]]
  grep -Eiq '^Content-Type: text/html' "$root/direct.headers"
  cmp "$root/public_html/index.html" "$root/direct.body"
fi
echo 'Private snapshot is not directly served'
