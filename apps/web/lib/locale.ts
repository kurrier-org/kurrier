export const LOCALES = ["en", "br", "ko"] as const;

export type Locale = (typeof LOCALES)[number];

export const hasLocale = (locale: string): locale is Locale =>
	(LOCALES as readonly string[]).includes(locale);
