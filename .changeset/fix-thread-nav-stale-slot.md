---
"@kurrier/repo": patch
---

Fix mailbox thread view staying open after clicking a folder in the sidebar while a thread is open, caused by the intercepted @thread parallel-route slot not resetting on soft navigation. Clicking a folder now forces a real navigation when a thread is currently open.
