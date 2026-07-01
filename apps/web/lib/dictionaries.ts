import "server-only";

const dictionaries = {
    en: () =>
        import("@/lib/dictionaries/en.json").then((module) => module.default),

    ko: () =>
        import("@/lib/dictionaries/ko.json").then((module) => module.default),
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = Awaited<
    ReturnType<(typeof dictionaries)[Locale]>
>;

export const hasLocale = (locale: string): locale is Locale =>
    locale in dictionaries;

export async function getDictionary(
    locale: string,
): Promise<Dictionary> {
    const key: Locale = hasLocale(locale) ? locale : "en";
    return dictionaries[key]();
}
