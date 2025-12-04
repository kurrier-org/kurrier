"use server";
import { rlsClient } from "@/lib/actions/clients";
import {
	CalendarEventEntity,
	CalendarEventInsertSchema,
	calendarEvents,
	CalendarEventUpdateSchema,
	calendars,
	identities,
} from "@db";
import { and, eq, gte, lte } from "drizzle-orm";
import {
	CalendarViewType,
	EventSlotFragment,
	FormState,
	handleAction,
	SlotKey,
	ViewParams,
} from "@schema";
import { decode } from "decode-formdata";
import { revalidatePath } from "next/cache";
import { Dayjs } from "dayjs";
import { cache } from "react";
import { getRedis } from "@/lib/actions/get-redis";
import { dayjsExtended, getDayjsTz } from "@common/day-js-extended";

export const fetchDefaultCalendar = cache(async () => {
	const rls = await rlsClient();
	const [defaultCalendar] = await rls((tx) =>
		tx.select().from(calendars).where(eq(calendars.isDefault, true)),
	);
	return defaultCalendar;
});

export const fetchCalendarEventsForView = async (
	calendarId: string,
	tz: string,
	view: CalendarViewType,
	params?: ViewParams,
) => {
	const { from, to } = await getRangeForCalendarView(tz, view, params);
	return fetchCalendarEvents(calendarId, from.toDate(), to.toDate());
};

export const fetchCalendarEvents = async (
	calendarId: string,
	from?: Date | string,
	to?: Date | string,
) => {
	const rls = await rlsClient();
	const fromDate = from ? new Date(from) : undefined;
	const toDate = to ? new Date(to) : undefined;
	const events = await rls((tx) =>
		tx
			.select()
			.from(calendarEvents)
			.where(
				and(
					eq(calendarEvents.calendarId, calendarId),
					fromDate ? gte(calendarEvents.endsAt, fromDate) : undefined,
					toDate ? lte(calendarEvents.startsAt, toDate) : undefined,
				),
			),
	);
	return events;
};

export const fetchOrganizers = async () => {
	const rls = await rlsClient();
	const allIdentities = await rls((tx) =>
		tx
			.select({
				value: identities.id,
				label: identities.value,
			})
			.from(identities),
	);
	return allIdentities;
};

export async function upsertCalendarEvent(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const decodedForm = decode(formData);
		const { tz, startsAt, endsAt, eventId, ...rest } = decodedForm;

		const startsAtDate = dayjsExtended
			.tz(String(startsAt), "YYYY-MM-DD HH:mm:ss", String(tz))
			.toDate();

		const endsAtDate = dayjsExtended
			.tz(String(endsAt), "YYYY-MM-DD HH:mm:ss", String(tz))
			.toDate();

		const payload = {
			...rest,
			tz,
			startsAt: startsAtDate,
			endsAt: endsAtDate,
		};

		const rls = await rlsClient();

		if (eventId && String(eventId).length > 0) {
			const parsedPayload = CalendarEventUpdateSchema.parse(payload);
			await rls((tx) =>
				tx
					.update(calendarEvents)
					.set(parsedPayload)
					.where(eq(calendarEvents.id, String(eventId))),
			);
			const { davQueue } = await getRedis();
			await davQueue.add("dav:calendar:update-event", {
				eventId: eventId,
			});
		} else {
			const parsedPayload = CalendarEventInsertSchema.parse(payload);
			const [calendarEvent] = await rls((tx) =>
				tx.insert(calendarEvents).values(parsedPayload).returning(),
			);
			const { davQueue } = await getRedis();
			await davQueue.add("dav:calendar:create-event", {
				eventId: calendarEvent.id,
			});
		}

		revalidatePath("/dashboard/calendar");

		return {
			success: true,
		};
	});
}

export async function getRangeForCalendarView(
	tz: string,
	view: CalendarViewType,
	params?: ViewParams,
): Promise<{ from: Dayjs; to: Dayjs }> {
	const dayjsTz = getDayjsTz(tz);

	const base: Dayjs =
		params?.year && params?.month && params?.day
			? dayjsTz()
					.year(params.year)
					.month(params.month - 1)
					.date(params.day)
			: dayjsTz();

	let from: Dayjs;
	let to: Dayjs;

	switch (view) {
		case "day":
			from = base.startOf("day");
			to = base.endOf("day");
			break;

		case "week":
			from = base.startOf("week");
			to = base.endOf("week");
			break;

		case "month":
			from = base.startOf("month");
			to = base.endOf("month");
			break;

		case "year":
			from = base.startOf("year");
			to = base.endOf("year");
			break;

		default:
			throw new Error(`Unsupported calendar view: ${view}`);
	}

	return { from, to };
}

export async function eventsBySlot(
	tz: string,
	events: CalendarEventEntity[],
): Promise<Map<SlotKey, EventSlotFragment[]>> {
	const map = new Map<SlotKey, EventSlotFragment[]>();
	const dayjsTz = getDayjsTz(tz);

	for (const ev of events) {
		const start = dayjsTz(ev.startsAt);
		const end = dayjsTz(ev.endsAt);

		if (!end.isAfter(start)) continue;

		let slotStart = start.startOf("hour");

		while (slotStart.isBefore(end)) {
			const slotEnd = slotStart.add(1, "hour");

			const overlapStart = start.isAfter(slotStart) ? start : slotStart;
			const overlapEnd = end.isBefore(slotEnd) ? end : slotEnd;

			if (overlapEnd.isAfter(overlapStart)) {
				const totalMs = slotEnd.valueOf() - slotStart.valueOf();
				const offsetMs = overlapStart.valueOf() - slotStart.valueOf();
				const occupiedMs = overlapEnd.valueOf() - overlapStart.valueOf();

				const key: SlotKey = `${slotStart.format("YYYY-MM-DD")}:${slotStart.hour()}`;

				const fragment: EventSlotFragment = {
					event: ev,
					date: slotStart.format("YYYY-MM-DD"),
					hour: slotStart.hour(),
					topPercent: (offsetMs / totalMs) * 100,
					heightPercent: (occupiedMs / totalMs) * 100,
					isStart: overlapStart.isSame(start),
					isEnd: overlapEnd.isSame(end),
				};

				const bucket = map.get(key);
				if (bucket) bucket.push(fragment);
				else map.set(key, [fragment]);
			}

			slotStart = slotStart.add(1, "hour");
		}
	}

	return map;
}

export async function eventsByDay(
	tz: string,
	events: CalendarEventEntity[],
): Promise<Map<string, EventSlotFragment[]>> {
	const map = new Map<string, EventSlotFragment[]>();
	const dayjsTz = getDayjsTz(tz);

	for (const ev of events) {
		const eventStart = dayjsTz(ev.startsAt);
		const eventEnd = dayjsTz(ev.endsAt);

		let cursor = eventStart.startOf("day");
		const lastDay = eventEnd.startOf("day");

		while (cursor.isSameOrBefore(lastDay, "day")) {
			const dayKey = cursor.format("YYYY-MM-DD");
			const dayStart = cursor; // start of this day in calendar tz
			const dayEnd = cursor.endOf("day"); // end of this day in calendar tz

			const visibleStart = eventStart.isAfter(dayStart) ? eventStart : dayStart;
			const visibleEnd = eventEnd.isBefore(dayEnd) ? eventEnd : dayEnd;

			if (!visibleEnd.isAfter(visibleStart)) {
				cursor = cursor.add(1, "day");
				continue;
			}

			const minutesFromMidnight = visibleStart.diff(dayStart, "minute");
			const durationMinutes = Math.max(
				5,
				visibleEnd.diff(visibleStart, "minute"),
			);

			const totalMinutes = 24 * 60;
			const topPercent = (minutesFromMidnight / totalMinutes) * 100;
			const heightPercent = (durationMinutes / totalMinutes) * 100;

			const fragment: EventSlotFragment = {
				event: ev,
				date: dayKey,
				hour: visibleStart.hour(),
				topPercent,
				heightPercent,
				isStart: visibleStart.isSame(eventStart),
				isEnd: visibleEnd.isSame(eventEnd),
			};

			const bucket = map.get(dayKey);
			if (bucket) bucket.push(fragment);
			else map.set(dayKey, [fragment]);

			cursor = cursor.add(1, "day");
		}
	}

	return map;
}

export const deleteCalendarEvent = async (id: string): Promise<FormState> => {
	return handleAction(async () => {
		const { davQueue } = await getRedis();
		await davQueue.add("dav:calendar:delete-event", {
			eventId: id,
		});

		const rls = await rlsClient();
		await rls((tx) =>
			tx.delete(calendarEvents).where(eq(calendarEvents.id, id)),
		);

		revalidatePath("/dashboard/calendar");
		return {
			success: true,
		};
	});
};
