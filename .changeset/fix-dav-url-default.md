---
"@kurrier/repo": patch
---

Fix DAV_URL in db/example.env defaulting to the internal Docker service name (http://dav:80), which is never reachable by an external CalDAV/CardDAV client. Defaults to http://localhost:5232 now, matching the exposed host port and the dev env template. Documented that hosted deployments need to set DAV_URL to their own public domain, same as WEB_URL.
