import { z } from "zod";
import {
	CalendarEntity,
	CalendarEventAttendeeEntity,
	CalendarEventEntity,
} from "@db";

export const calendarViewsList = ["day", "week", "month", "year"] as const;
export type CalendarViewType = z.infer<typeof calendarViewsList>;
export type CalendarOrganizerType = {
	value: string;
	label: string;
	displayName: string | null;
};
export type CalendarState = {
	userTz?: string;
	defaultCalendar: CalendarEntity;
	calendarEvents?: CalendarEventEntity[];
	calendarEventAttendees?: Record<string, CalendarEventAttendeeEntity[]>;
	attendeeContacts?: ComposeContact[];
	organizers: CalendarOrganizerType[];
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

export type CalendarEventStatusType = z.infer<typeof calendarEventStatusList>;

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
	event: CalendarEventEntity & {
		instanceId?: string | null;
		recurrenceMasterId?: string | null;
	};
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

export type ItipKind = "REQUEST" | "CANCEL" | "REPLY" | "PUBLISH" | "UNKNOWN";

export const calendarAttendeeRoleList = [
	"req_participant",
	"opt_participant",
	"non_participant",
	"chair",
] as const;

export type CalendarAttendeeRole = z.infer<typeof calendarAttendeeRoleList>;

export const calendarAttendeePartstatList = [
	"needs_action",
	"accepted",
	"declined",
	"tentative",
	"delegated",
	"in_process",
	"completed",
] as const;

export type CalendarAttendeePartstat = z.infer<
	typeof calendarAttendeePartstatList
>;

export type ComposeContact = {
	id: string;
	name: string;
	email: string;
	avatar: string | null;
};

export type ItipAction = "create" | "update" | "cancel";

export const PARTSTAT_LABEL: Record<string, string> = {
	accepted: "Accepted",
	declined: "Declined",
	tentative: "Tentative",
	needs_action: "No response",
	delegated: "Delegated",
	in_process: "In process",
	completed: "Completed",
};

export type AllDayFragment = {
	event: CalendarEventEntity;
	date: string;
	isStart: boolean;
	isEnd: boolean;
};

export type Freq = "none" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type UntilMode = "never" | "on" | "after";

export type RecurrenceRulesFormInputProps = {
	name: string;
	defaultValue?: string | null;
};

export type ParsedRRuleState = {
	freq: Freq;
	interval: number;
	untilMode: UntilMode;
	untilDate: Date | null;
	count: number | "";
	byWeekdays: string[];
};

export const WEEKDAY_OPTIONS = [
	{ label: "Mon", value: "MO" },
	{ label: "Tue", value: "TU" },
	{ label: "Wed", value: "WE" },
	{ label: "Thu", value: "TH" },
	{ label: "Fri", value: "FR" },
	{ label: "Sat", value: "SA" },
	{ label: "Sun", value: "SU" },
];

export type CalendarEventInstance = CalendarEventEntity & {
	instanceId: string;
	recurrenceMasterId?: string | null;
};
