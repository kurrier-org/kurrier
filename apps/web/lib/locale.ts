export const LOCALES = ["en", "pt-BR", "ko", "pl", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

export const hasLocale = (locale: string): locale is Locale =>
	(LOCALES as readonly string[]).includes(locale);

// dayjs (and @mantine/dates, which resolves month/weekday names through it)
// uses lowercase, hyphenated locale ids that don't always match our BCP-47
// locale codes.
export const DAYJS_LOCALES: Record<Locale, string> = {
	en: "en",
	"pt-BR": "pt-br",
	ko: "en",
	pl: "pl",
	ru: "ru",
};
