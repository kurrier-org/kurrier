---
"@kurrier/repo": patch
---

Add OIDC_REQUIRE_VERIFIED_EMAIL to make the email_verified requirement optional for generic OIDC login, for IdPs that never set this claim to true.
