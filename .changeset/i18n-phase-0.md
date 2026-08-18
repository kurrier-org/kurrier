---
"@kurrier/repo": minor
---

Add i18n dictionary architecture (namespaced JSON files per locale, a DictionaryProvider/useDictionary() hook so client components can access translations without prop-drilling, and a check-locales script to catch key drift), the language switcher UI, and a new Brazilian Portuguese (br) locale with full common+auth coverage. First step of a series of PRs adding full pt-BR translation across the app.
