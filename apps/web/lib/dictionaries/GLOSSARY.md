# Translation glossary

Conventions for keeping locale files consistent as they grow. This file is
documentation only — it isn't read by the app.

## Brazilian Portuguese (`br`)

- **Formality**: use formal *você* (never *tu* or *o senhor/a senhora*).
- **Buttons and actions**: imperative mood, capitalized like a title —
  "Salvar", "Excluir", "Enviar", not "Salvando" or "Você deve salvar".
- **Punctuation**: no exclamation marks in error/validation messages; keep
  toast/success messages neutral and short.

### Fixed terms

Keep these consistent everywhere a term appears, across all namespaces.

| English | pt-BR (`br`) | Notes |
|---|---|---|
| mailbox | caixa de entrada | |
| thread | conversa | |
| identity | identidade | |
| workspace | workspace | kept untranslated — matches common BR SaaS usage |
| draft | rascunho | |
| label | etiqueta | |
| provider | provedor | |
| webhook | webhook | kept untranslated |
| API key | chave de API | |
| snoozed | adiado | |
| scheduled | agendado | |

When a new recurring term comes up in a later translation phase, add it here
so subsequent PRs stay consistent instead of re-deciding it per file.

## Adding a new locale

1. Create `apps/web/lib/dictionaries/<code>/` with one `.json` file per
   namespace (mirror the file list under `en/`).
2. Add the locale to `dictionaries.ts` (loader map + `Dictionary` casting,
   following the `br`/`ko` pattern), `proxy.ts`'s `locales` array, and
   `LOCALE_LABELS` in `components/common/language-switcher.tsx`.
3. Run `pnpm check:locales` — it diffs your new locale's keys against `en`
   (the source of truth) and reports anything missing or extra.
4. It's fine to ship a locale with only some namespaces translated — add the
   locale's code to `PARTIAL_LOCALES` in `scripts/check-locales.ts` so the
   script warns instead of failing until it's complete.
