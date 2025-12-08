import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import calendar from "dayjs/plugin/calendar.js";
import isBetween from "dayjs/plugin/isBetween.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import relativeTime from "dayjs/plugin/relativeTime.js";
import advancedFormat from "dayjs/plugin/advancedFormat.js";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
dayjs.extend(calendar);
dayjs.extend(isBetween);
dayjs.extend(isSameOrBefore);
dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);
dayjs.extend(advancedFormat);

export const dayjsExtended = dayjs;

export function getDayjsTz(defaultTz: string) {
	return (input?: any) =>
		input ? dayjs(input).tz(defaultTz) : dayjs().tz(defaultTz);
}

export function getWallTimeDate(d: Dayjs) {
	return new Date(
		d.year(),
		d.month(),
		d.date(),
		d.hour(),
		d.minute(),
		d.second(),
		d.millisecond(),
	);
}
