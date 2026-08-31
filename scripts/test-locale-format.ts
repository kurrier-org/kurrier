import assert from "node:assert/strict";
import { createLocaleFormatter } from "../apps/web/lib/locale-format";

function expectedTimeOfDay(locale: string, hour: number) {
	return new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(2026, 0, 15, hour)));
}

for (const locale of ["en", "pl", "pt-BR", "ru", "ko"] as const) {
	const format = createLocaleFormatter(locale);

	for (const hour of [0, 9, 18, 23]) {
		assert.equal(
			format.timeOfDay(hour),
			expectedTimeOfDay(locale, hour),
			`${locale} should render ${hour}:00 independently of the browser timezone`,
		);
	}
}

assert.throws(() => createLocaleFormatter("en").timeOfDay(-1), RangeError);
assert.throws(() => createLocaleFormatter("en").timeOfDay(24), RangeError);

console.log("Locale formatter time-of-day checks passed.");
