// @ts-nocheck
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DICT_DIR = join(__dirname, "..", "apps", "web", "lib", "dictionaries");
const SOURCE_LOCALE = "en";
// Locales still being filled in — reported but not a hard failure.
const PARTIAL_LOCALES = new Set(["ko"]);

function keysOf(value: unknown, prefix = ""): string[] {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return prefix ? [prefix] : [];
	}
	return Object.entries(value as Record<string, unknown>).flatMap(([key, v]) =>
		keysOf(v, prefix ? `${prefix}.${key}` : key),
	);
}

function loadNamespace(locale: string, namespace: string): unknown {
	const file = join(DICT_DIR, locale, `${namespace}.json`);
	if (!existsSync(file)) return {};
	return JSON.parse(readFileSync(file, "utf-8"));
}

const locales = readdirSync(DICT_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);

const namespaces = readdirSync(join(DICT_DIR, SOURCE_LOCALE))
	.filter((file) => file.endsWith(".json"))
	.map((file) => file.replace(/\.json$/, ""));

let hasStrictFailure = false;

for (const locale of locales) {
	if (locale === SOURCE_LOCALE) continue;

	const missing: string[] = [];
	const extra: string[] = [];

	for (const namespace of namespaces) {
		const sourceKeys = new Set(keysOf(loadNamespace(SOURCE_LOCALE, namespace)));
		const localeKeys = new Set(keysOf(loadNamespace(locale, namespace)));

		for (const key of sourceKeys) {
			if (!localeKeys.has(key)) missing.push(`${namespace}.${key}`);
		}
		for (const key of localeKeys) {
			if (!sourceKeys.has(key)) extra.push(`${namespace}.${key}`);
		}
	}

	const isPartial = PARTIAL_LOCALES.has(locale);

	if (missing.length === 0 && extra.length === 0) {
		console.log(`✓ ${locale} matches ${SOURCE_LOCALE}`);
		continue;
	}

	console.log(
		`${isPartial ? "△" : "✗"} ${locale}${isPartial ? " (partial, not strict)" : ""}`,
	);
	if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
	if (extra.length) console.log(`  extra:   ${extra.join(", ")}`);

	if (!isPartial) hasStrictFailure = true;
}

if (hasStrictFailure) {
	console.error("\nLocale key mismatch found.");
	process.exit(1);
} else {
	console.log("\nAll strict locales match.");
}
