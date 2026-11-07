import assert from "node:assert/strict";
import { createLocaleFormatter } from "../apps/web/lib/locale-format";

function expectedTimeOfDay(locale: string, hour: number) {
	return new Intl.DateTimeFormat(locale, {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(2026, 0, 15, hour)));
}

const expectedDateInputFormats = {
	en: "DD MMM",
	pl: "DD.MM.YYYY",
	"pt-BR": "DD/MM/YYYY",
	ru: "DD.MM.YYYY",
	ko: "DD MMM",
} as const;

for (const locale of ["en", "pl", "pt-BR", "ru", "ko"] as const) {
	const format = createLocaleFormatter(locale);
	const dateInputFormat = expectedDateInputFormats[locale];
	const timeInputFormat =
		format.hourCycle() === "h23" || format.hourCycle() === "h24"
			? "HH:mm"
			: "hh:mm A";

	assert.equal(
		format.dateInputFormat(),
		dateInputFormat,
		`${locale} should use its locale-aware calendar date input format`,
	);
	assert.equal(
		format.dateTimeInputFormat(),
		`${dateInputFormat} ${timeInputFormat}`,
		`${locale} should use its locale-aware calendar date-time input format`,
	);

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
