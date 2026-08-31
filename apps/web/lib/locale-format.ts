export type PluralForms = {
	other: string;
	one?: string;
	two?: string;
	few?: string;
	many?: string;
	zero?: string;
};

type DateValue = Date | string | number;

const DATE_INPUT_FORMATS: Record<string, string> = {
	en: "DD MMM",
	ko: "DD MMM",
	"pt-BR": "DD/MM/YYYY",
	pl: "DD.MM.YYYY",
	ru: "DD.MM.YYYY",
};

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
	const hourCycle = new Intl.DateTimeFormat(resolvedLocale, {
		hour: "numeric",
	}).resolvedOptions().hourCycle;

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

		timeOfDay(hour: number) {
			if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
				throw new RangeError("hour must be an integer from 0 through 23");
			}

			return date(new Date(Date.UTC(2026, 0, 15, hour)), {
				hour: "2-digit",
				minute: "2-digit",
				timeZone: "UTC",
			});
		},

		number(value: number, options?: Intl.NumberFormatOptions) {
			return options
				? new Intl.NumberFormat(resolvedLocale, options).format(value)
				: numberFormatter.format(value);
		},

		hourCycle() {
			return hourCycle;
		},

		dateTimeInputFormat() {
			const dateFormat = DATE_INPUT_FORMATS[resolvedLocale] ?? "DD MMM";
			const timeFormat =
				hourCycle === "h23" || hourCycle === "h24" ? "HH:mm" : "hh:mm A";
			return `${dateFormat} ${timeFormat}`;
		},

		plural(count: number) {
			return pluralRules.select(count);
		},

		message(count: number, forms: PluralForms) {
			const category =
				count === 0 && forms.zero ? "zero" : pluralRules.select(count);
			const template = forms[category] ?? forms.other;
			return template.replaceAll("{count}", numberFormatter.format(count));
		},
	};
}

export type LocaleFormatter = ReturnType<typeof createLocaleFormatter>;
