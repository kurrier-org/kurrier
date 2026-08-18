export const LOCALES = ["en", "pt-BR", "ko"] as const;

export type Locale = (typeof LOCALES)[number];

export const hasLocale = (locale: string): locale is Locale =>
	(LOCALES as readonly string[]).includes(locale);
