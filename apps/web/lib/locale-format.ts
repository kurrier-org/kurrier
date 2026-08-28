type PolishPluralForms = {
	one: string;
	few: string;
	many: string;
};

/** Returns the correct Polish cardinal form for a count. */
export function selectPolishPluralForm(
	count: number,
	forms: PolishPluralForms,
) {
	const category = new Intl.PluralRules("pl").select(count);
	return category === "one"
		? forms.one
		: category === "few"
			? forms.few
			: forms.many;
}

/**
 * Formats legacy count labels for Polish, which has three cardinal forms.
 *
 * Keep new messages as complete, locale-owned strings where possible. This
 * bridge is for existing UI that composes a count with a legacy label.
 */
export function formatPolishCount(
	locale: string | undefined,
	count: number,
	forms: PolishPluralForms,
	fallback: string,
) {
	if (locale !== "pl") return `${count} ${fallback}`;
	return `${count} ${selectPolishPluralForm(count, forms)}`;
}

export function formatLocalizedDateTime(
	value: Date | string | number,
	locale: string | undefined,
	options: Intl.DateTimeFormatOptions,
) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";

	return new Intl.DateTimeFormat(locale ?? "en", options).format(date);
}

export function formatLocalizedTime(
	value: Date | string | number,
	locale: string | undefined,
) {
	return formatLocalizedDateTime(value, locale, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function formatLocalizedCalendarTime(
	value: Date | string | number,
	locale: string | undefined,
	timeZone: string,
) {
	return formatLocalizedDateTime(value, locale, {
		hour: "2-digit",
		minute: "2-digit",
		timeZone,
	});
}
