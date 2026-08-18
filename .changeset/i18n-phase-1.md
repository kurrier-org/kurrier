---
"@kurrier/repo": minor
---

Wire dictionary-based translation resolution into the shared ReusableForm/ReusableFormItems components (used by nearly every form in the app), so server-action and validation messages can be translated by returning dotted keys instead of literal English. Purely additive — no behavior change today since the action/validation namespaces are still empty.
