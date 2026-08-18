---
"@kurrier/repo": patch
---

Fix two 404s introduced by the locale-routing merge: the locale root ("/{locale}") had no page to catch the post-login redirect, and the auth-pages guard for already-authenticated users pointed at a stale, non-localized, workspace-less path. Both now resolve the user's workspace and redirect correctly.
