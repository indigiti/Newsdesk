# NewsDesk on DigiOps

Use repository indigiti/Newsdesk, branch main, artifact digiops-release, application URL /newsdesk/, public path public_html/newsdesk/, and private path private_html/newsdesk/. The package contains RELEASE.json, public/ and private/. Node runs in CI only.

Deploy a successful main build. Upload feeds.json to private_html/newsdesk/storage/ using a graphical SFTP client. This file is a JSON array of objects with name and url fields. Start with one trusted, operator-approved public HTTPS RSS 2.0 feed. Never accept feed URLs from visitors or place configuration in the web root. The PHP-FPM user must be able to read the feed configuration and write in storage. Enable cURL, SimpleXML and mbstring in web PHP.

Open /newsdesk/ to fetch the first snapshot. No cron or terminal is required. The stories API refreshes missing or five-minute-old snapshots on demand; fresh snapshots skip network calls. The triggering request can wait up to eight seconds for feed I/O. A nonblocking lock prevents parallel refreshes, and failed attempts back off for at least one minute. The previous snapshot remains available if any configured feed fails. No visits or API requests means no refresh. CLI ingestion remains optional and shares the lock.

Confirm /newsdesk/api/stories.php returns non-null updated_at and inspect X-NewsDesk-Refresh for refresh status. Verify that storage/ is private and survives a DigiOps redeploy. The static dashboard health check alone does not verify ingestion.
