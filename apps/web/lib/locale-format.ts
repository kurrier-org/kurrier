export type PluralForms = {
	other: string;
	one?: string;
	two?: string;
	few?: string;
	many?: string;
	zero?: string;
};

type DateValue = Date | string | number;

function toDate(value: DateValue) {
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Creates locale-aware formatters using only the platform `Intl` APIs.
 * Translation strings remain owned by the dictionaries passed to `message`.
 */
export function createLocaleFormatter(locale: string | undefined) {
	const resolvedLocale = locale ?? "en";
	const pluralRules = new Intl.PluralRules(resolvedLocale);
	const numberFormatter = new Intl.NumberFormat(resolvedLocale);

	const date = (value: DateValue, options?: Intl.DateTimeFormatOptions) => {
		const parsed = toDate(value);
		return parsed
			? new Intl.DateTimeFormat(resolvedLocale, options).format(parsed)
			: "";
	};

	return {
		date,

		time(value: DateValue, options?: Intl.DateTimeFormatOptions) {
			return date(value, {
				hour: "2-digit",
				minute: "2-digit",
				...options,
			});
		},

		number(value: number, options?: Intl.NumberFormatOptions) {
			return options
				? new Intl.NumberFormat(resolvedLocale, options).format(value)
				: numberFormatter.format(value);
		},

		hourCycle() {
			return new Intl.DateTimeFormat(resolvedLocale, {
				hour: "numeric",
			}).resolvedOptions().hourCycle;
		},

		plural(count: number) {
			return pluralRules.select(count);
		},

		message(count: number, forms: PluralForms) {
			const template = forms[pluralRules.select(count)] ?? forms.other;
			return template.replaceAll("{count}", numberFormatter.format(count));
		},
	};
}

export type LocaleFormatter = ReturnType<typeof createLocaleFormatter>;
