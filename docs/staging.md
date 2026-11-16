# NewsDesk on DigiOps

Use repository indigiti/Newsdesk, branch main, artifact digiops-release, application URL /newsdesk/, public path public_html/newsdesk/, and private path private_html/newsdesk/. The package contains RELEASE.json, public/ and private/. Node runs in CI only.

Deploy a successful main build. The release bundles five public RSS sources in private_html/newsdesk/config/feeds.default.json. A visit uses those sources automatically if there is no private_html/newsdesk/storage/feeds.json. NewsDesk attempts to create storage on first use; the PHP-FPM user must be able to create it or write to it if it already exists. No manual upload is required for the defaults. Verify publisher permissions for your use and that Cloudways can fetch the feeds. Enable cURL, SimpleXML and mbstring in web PHP.

To replace the starter list, upload storage/feeds.json with an array of objects containing name and url fields. That file takes precedence and is not overwritten by deployment. Use only trusted, approved public HTTPS RSS 2.0 feeds. Never accept feed URLs from visitors or put configuration in the web root.

Open /newsdesk/ to fetch the first snapshot. No cron or terminal is required. The stories API refreshes missing or five-minute-old snapshots on demand; fresh snapshots skip network calls. The triggering request can wait up to eight seconds for feed I/O. A nonblocking lock prevents parallel refreshes, and failed attempts back off for at least one minute. With bundled sources, unavailable feeds are skipped and a new snapshot is written only when usable stories are found. With a custom configuration, all feeds must succeed. If no new snapshot is written, the previous one remains available. No visits or API requests means no refresh. CLI ingestion remains optional and shares the lock.

Confirm /newsdesk/api/stories.php returns non-null updated_at and inspect X-NewsDesk-Refresh for refresh status. Verify that storage/ is private and survives a DigiOps redeploy. The static dashboard health check alone does not verify ingestion.
