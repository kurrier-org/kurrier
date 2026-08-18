---
"@kurrier/repo": patch
---

Fix mailbox thread view staying open after clicking a folder in the sidebar while a thread is open, caused by the intercepted @thread parallel-route slot not resetting on soft navigation. The slot is now keyed by the current pathname so it unmounts (and re-resolves against @thread/default.tsx) whenever the URL changes, instead of relying on a manual router.push()/router.refresh() workaround that didn't reliably clear it.
