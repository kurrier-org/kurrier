import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import calendar from 'dayjs/plugin/calendar'
import isBetween from 'dayjs/plugin/isBetween';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import relativeTime from "dayjs/plugin/relativeTime";
import advancedFormat from "dayjs/plugin/advancedFormat";

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
