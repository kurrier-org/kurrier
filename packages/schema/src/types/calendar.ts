import { z } from "zod";
import { CalendarEntity, CalendarEventEntity } from "@db";

export const calendarViewsList = ["day", "week", "month", "year"] as const;
export type CalendarViewType = z.infer<typeof calendarViewsList>;
export type CalendarState = {
	userTz?: string;
	defaultCalendar: CalendarEntity;
	calendarEvents?: CalendarEventEntity[];
	organizers: { value: string; label: string }[];
	calendarTzAbbr: string;
	calendarTzName: string;
	activePopoverId?: string | null;
	activePopoverEditEvent?: CalendarEventEntity;
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

export type ViewParams = {
	year?: number;
	month?: number;
	day?: number;
};

export type SlotKey = string;

export type EventSlotFragment = {
	event: CalendarEventEntity;
	date: string;
	hour: number;
	topPercent: number;
	heightPercent: number;
	isStart: boolean;
	isEnd: boolean;
};

export type EventSlotRenderFragment = EventSlotFragment & {
	columnIndex: number;
	columnCount: number;
};
