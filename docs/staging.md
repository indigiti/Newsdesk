# Cloudways staging

Use a dedicated Custom PHP app at the domain root. No WordPress or Node process on the server.

1. Build with Node 22 using npm install and npm run build. Deploy the contents of out/ into public_html.
2. Copy php/api/stories.php to public_html/api/stories.php. Keep php/ingest.php outside the web root.
3. Create newsdesk-private next to public_html. Give the cron user write access and PHP-FPM read access to the snapshot. Do not commit live feeds or snapshots. In newsdesk-private/feeds.json, enter a JSON array of objects with name and url fields. Use only operator-approved, trusted public HTTPS RSS 2.0 URLs; this file is not editable through the dashboard.
4. Enable PHP curl, SimpleXML and mbstring. Run php /absolute/path/ingest.php /absolute/path/newsdesk-private and check /api/stories.php. Schedule the same command in Cloudways cron. Restrict the staging site and API at the hosting layer before using nonpublic content.
5. Add a new item to a test feed, run ingestion again, and check the inbox without rebuilding. Confirm that a failed feed refresh leaves the previous snapshot intact.

The first slice uses exact normalized headline matches, not semantic clustering. It does not include authentication, shadcn components, editorial merge/split, SQL, Redis, or AI. No article proxy is shipped.

## CI validation and release artifact

The Staging checks workflow builds the static app and exercises it through PHP's local test server with a controlled HTTPS RSS fixture. On success, download the `newsdesk-cloudways` artifact. Copy only its `public_html/` contents into the Cloudways web root. Install `bin/ingest.php` alongside, not inside, the web root. The artifact contains no credentials, feed configuration, or live data. Repeat the smoke test on Cloudways: CI does not verify that host's cron permissions, PHP configuration, or access restrictions.
