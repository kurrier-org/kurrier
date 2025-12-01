import {z} from "zod/index";
import {CalendarEntity} from "@db";


export const calendarViewsList = ["day", "week", "month", "year"] as const;
export type CalendarViewType = z.infer<typeof calendarViewsList>;
export type CalendarState = {
    userTz?: string;
    defaultCalendar: CalendarEntity
    calendarTzAbbr: string;
    calendarTzName: string;
};

export const calendarEventStatusList = [
    "confirmed",
    "tentative",
    "cancelled",
] as const;

export const calendarBusyStatusList = [
    "busy",
    "free",
    "tentative",
    "out_of_office",
] as const;
