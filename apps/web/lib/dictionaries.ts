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
		vault,
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
		import("@/lib/dictionaries/en/vault.json").then((m) => m.default),
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
		vault,
	};
}

// "en" is the source of truth for the shape every other locale must match.
// scripts/check-locales.ts verifies that structurally at build/review time.
export type Dictionary = Awaited<ReturnType<typeof loadEn>>;

async function loadPtBr(): Promise<Dictionary> {
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
		vault,
	] = await Promise.all([
		import("@/lib/dictionaries/pt-BR/common.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/auth.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/mailbox.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/platform.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/contacts.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/calendar.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/drive.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/dashboard.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/validation.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/actions.json").then((m) => m.default),
		import("@/lib/dictionaries/pt-BR/vault.json").then((m) => m.default),
	]);

	return {
		locale: "pt-BR",
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
		vault,
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
		vault,
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
		import("@/lib/dictionaries/ko/vault.json").then((m) => m.default),
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
		vault,
	} as Dictionary;
}

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
	en: loadEn,
	"pt-BR": loadPtBr,
	ko: loadKo,
};

export type { Locale };
export { hasLocale };

export async function getDictionary(locale: string): Promise<Dictionary> {
	const key: Locale = hasLocale(locale) ? locale : "en";
	return dictionaries[key]();
}
