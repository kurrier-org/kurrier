# Translation glossary

Conventions for keeping locale files consistent as they grow. This file is
documentation only — it isn't read by the app.

## Brazilian Portuguese (`pt-BR`)

- **Formality**: use formal *você* (never *tu* or *o senhor/a senhora*).
- **Buttons and actions**: imperative mood, capitalized like a title —
  "Salvar", "Excluir", "Enviar", not "Salvando" or "Você deve salvar".
- **Punctuation**: no exclamation marks in error/validation messages; keep
  toast/success messages neutral and short.

### Fixed terms

Keep these consistent everywhere a term appears, across all namespaces.

| English | pt-BR | Notes |
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

## Russian (`ru`)

- **Tone**: neutral and concise; address the user without gendered wording.
- **Buttons and actions**: use the infinitive — «Сохранить», «Удалить»,
  «Отправить».
- **Typography**: use «ёлочки» for user-facing quotations and the letter «ё»
  where appropriate.

### Fixed terms

| English | Russian | Notes |
|---|---|---|
| mailbox | почтовый ящик | Use «ящик» only where the mail context is clear |
| thread | цепочка | A group of related messages |
| identity | почтовый адрес | Prefer the user-facing concept over literal «идентичность» |
| workspace | рабочее пространство | |
| draft | черновик | |
| label | метка | |
| provider | провайдер | |
| webhook | вебхук | |
| API key | ключ API | |
| snoozed | отложенный | |
| scheduled | запланированный | |


## Polish (`pl`)

- **Tone**: neutral, concise and professional; avoid gendered forms where a
  natural impersonal construction is available.
- **Buttons and actions**: use the imperative — „Zapisz”, „Usuń”, „Wyślij”.
- **Typography**: use Polish quotation marks („…”) in user-facing text where
  quotation marks are needed.

### Fixed terms

| English | Polish | Notes |
|---|---|---|
| mailbox | skrzynka pocztowa | |
| thread | wątek | A group of related messages |
| identity | tożsamość e-mail | Do not use literal „identyfikacja” |
| workspace | obszar roboczy | |
| draft | wersja robocza | |
| label | etykieta | |
| provider | dostawca | |
| webhook | webhook | Kept as established technical usage |
| API key | klucz API | |
| snoozed | odłożone | Use verb „Odłóż” for the action |
| scheduled | zaplanowane | |

## Adding a new locale

1. Create `apps/web/lib/dictionaries/<code>/` with one `.json` file per
   namespace (mirror the file list under `en/`).
2. Add the locale to `dictionaries.ts` (loader map + `Dictionary` casting,
   following the `pt-BR`/`ko` pattern), `proxy.ts`'s `locales` array, and
   `LOCALE_LABELS` in `components/common/language-switcher.tsx`.
3. Run `pnpm check:locales` — it diffs your new locale's keys against `en`
   (the source of truth) and reports anything missing or extra.
4. It's fine to ship a locale with only some namespaces translated — add the
   locale's code to `PARTIAL_LOCALES` in `scripts/check-locales.ts` so the
   script warns instead of failing until it's complete.
