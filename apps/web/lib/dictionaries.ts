import "server-only";
import { hasLocale, type Locale } from "@/lib/locale";

async function loadEn() {
	const [
		common,
		auth,
		mailbox,
		platform,
		contacts,
		calendar,
		drive,
		dashboard,
		validation,
		actions,
	] = await Promise.all([
		import("@/lib/dictionaries/en/common.json").then((m) => m.default),
		import("@/lib/dictionaries/en/auth.json").then((m) => m.default),
		import("@/lib/dictionaries/en/mailbox.json").then((m) => m.default),
		import("@/lib/dictionaries/en/platform.json").then((m) => m.default),
		import("@/lib/dictionaries/en/contacts.json").then((m) => m.default),
		import("@/lib/dictionaries/en/calendar.json").then((m) => m.default),
		import("@/lib/dictionaries/en/drive.json").then((m) => m.default),
		import("@/lib/dictionaries/en/dashboard.json").then((m) => m.default),
		import("@/lib/dictionaries/en/validation.json").then((m) => m.default),
		import("@/lib/dictionaries/en/actions.json").then((m) => m.default),
	]);

	return {
		locale: "en" as Locale,
		common,
		auth,
		mailbox,
		platform,
		contacts,
		calendar,
		drive,
		dashboard,
		validation,
		actions,
	};
}

// "en" is the source of truth for the shape every other locale must match.
// scripts/check-locales.ts verifies that structurally at build/review time.
export type Dictionary = Awaited<ReturnType<typeof loadEn>>;

async function loadBr(): Promise<Dictionary> {
	const [
		common,
		auth,
		mailbox,
		platform,
		contacts,
		calendar,
		drive,
		dashboard,
		validation,
		actions,
	] = await Promise.all([
		import("@/lib/dictionaries/br/common.json").then((m) => m.default),
		import("@/lib/dictionaries/br/auth.json").then((m) => m.default),
		import("@/lib/dictionaries/br/mailbox.json").then((m) => m.default),
		import("@/lib/dictionaries/br/platform.json").then((m) => m.default),
		import("@/lib/dictionaries/br/contacts.json").then((m) => m.default),
		import("@/lib/dictionaries/br/calendar.json").then((m) => m.default),
		import("@/lib/dictionaries/br/drive.json").then((m) => m.default),
		import("@/lib/dictionaries/br/dashboard.json").then((m) => m.default),
		import("@/lib/dictionaries/br/validation.json").then((m) => m.default),
		import("@/lib/dictionaries/br/actions.json").then((m) => m.default),
	]);

	return {
		locale: "br",
		common,
		auth,
		mailbox,
		platform,
		contacts,
		calendar,
		drive,
		dashboard,
		validation,
		actions,
	} as Dictionary;
}

async function loadKo(): Promise<Dictionary> {
	const [
		common,
		auth,
		mailbox,
		platform,
		contacts,
		calendar,
		drive,
		dashboard,
		validation,
		actions,
	] = await Promise.all([
		import("@/lib/dictionaries/ko/common.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/auth.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/mailbox.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/platform.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/contacts.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/calendar.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/drive.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/dashboard.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/validation.json").then((m) => m.default),
		import("@/lib/dictionaries/ko/actions.json").then((m) => m.default),
	]);

	return {
		locale: "ko",
		common,
		auth,
		mailbox,
		platform,
		contacts,
		calendar,
		drive,
		dashboard,
		validation,
		actions,
	} as Dictionary;
}

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
	en: loadEn,
	br: loadBr,
	ko: loadKo,
};

export type { Locale };
export { hasLocale };

export async function getDictionary(locale: string): Promise<Dictionary> {
	const key: Locale = hasLocale(locale) ? locale : "en";
	return dictionaries[key]();
}
