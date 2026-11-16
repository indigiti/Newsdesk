# NewsDesk on DigiOps

Use repository indigiti/Newsdesk, branch main, artifact digiops-release, application URL /newsdesk/, public path public_html/newsdesk/, and private path private_html/newsdesk/. The build is specific to this subpath. The package contains RELEASE.json, public/ and private/. Node runs in CI only.

In DigiOps, deploy a successful main-branch run. The initial health path / checks the static dashboard; also verify /newsdesk/api/stories.php returns JSON. No snapshot yet is expected on a fresh deployment.

Create private_html/newsdesk/storage/ outside the public web root. Write feeds.json there as a JSON array of objects with name and url fields (trusted, operator-approved public HTTPS RSS 2.0 feeds). Do not include credentials, feeds or snapshots in the artifact. Give cron write access and PHP-FPM read access. Enable PHP cURL, SimpleXML and mbstring, and schedule:

    php /absolute/app/private_html/newsdesk/bin/ingest.php /absolute/app/private_html/newsdesk/storage

Run once manually and verify the inbox loads new stories without a rebuild. Check that the storage directory is not accessible from the web. The manifest declares storage/ persistent; verify it survives a redeploy on the target. Restrict staging access before adding nonpublic content.
