---
"@kurrier/repo": patch
---

Add missing default routes ([locale], [locale]/w, dashboard index), a branded not-found/error page instead of Next's default, and fix several places where a redirect dropped the current locale (post-signup/login, auth layout guards). Also removes the dead, unreachable app/page.tsx that pointed at a stale route shape.
