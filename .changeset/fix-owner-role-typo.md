---
"@kurrier/repo": patch
---

Fix workspace overview always showing 0 for Connected Providers, Active Identities, Verified Domains and Volumes due to an "owners"/"owner" string mismatch when checking the workspace role.
