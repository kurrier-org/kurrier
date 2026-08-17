---
"@kurrier/repo": patch
---

Fix Baikal's .well-known CalDAV/CardDAV redirect always resolving through http:// when Kurrier is deployed behind a reverse proxy terminating TLS. Mounts a corrected nginx config over the bundled one, deriving the redirect scheme from X-Forwarded-Proto instead of the container's own (always plain HTTP) connection scheme.
