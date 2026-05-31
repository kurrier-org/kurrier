"use server";
import {getWorkspaceId, rlsClient} from "@/lib/actions/clients";
import {
	addressBooks,
	CalendarEventAttendeeEntity,
	CalendarEventEntity,
	CalendarEventInsertSchema,
	calendarEvents,
	CalendarEventUpdateSchema,
	calendars,
	contacts,
	identities, MessageAttachmentEntity,
} from "@db";
import {
	and,
	eq,
	gte,
	lte,
	inArray,
	or,
	ilike,
	sql,
	isNull,
	not, desc, isNotNull
} from "drizzle-orm";
import {
	AllDayFragment,
	CalendarEventInstance,
	CalendarViewType,
	ComposeContact,
	EventSlotFragment,
	FormState, getServerEnv,
	handleAction,
	SlotKey,
	ViewParams,
} from "@schema";
import { decode } from "decode-formdata";
import { revalidatePath } from "next/cache";
import { Dayjs } from "dayjs";
import { getRedis } from "@/lib/actions/get-redis";
import { dayjsExtended, getDayjsTz } from "@common/day-js-extended";
import { calendarEventAttendees } from "@db";
import { PgTransaction } from "drizzle-orm/pg-core";
import { RRule } from "rrule";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {s3} from "@/lib/create-s3-client";
const { S3_BUCKET } = getServerEnv();


export const fetchDefaultCalendar = async (calendarPublicId?: string) => {
	const rls = await rlsClient();

	if (calendarPublicId) {
		const [cal] = await rls((tx) =>
			tx
				.select()
				.from(calendars)
				.where(and(
					eq(calendars.publicId, calendarPublicId),
					isNotNull(calendars.identityId)
				))
				.limit(1)
		);

		return cal ?? null;
	}

	const visibleCalendars = await rls((tx) =>
		tx
			.select()
			.from(calendars)
			.where(isNotNull(calendars.identityId))
			.orderBy(desc(calendars.createdAt))
	);

	return visibleCalendars[0] ?? null;
};


export async function fetchEventAttendees(
	eventIds: string[],
): Promise<Record<string, CalendarEventAttendeeEntity[]>> {
	if (eventIds.length === 0) return {};
	const rls = await rlsClient();
	const attendees = await rls((tx) =>
		tx
			.select()
			.from(calendarEventAttendees)
			.where(and(
				inArray(calendarEventAttendees.eventId, eventIds)
			)),
	);
	const result: Record<string, CalendarEventAttendeeEntity[]> = {};

	for (const attendee of attendees) {
		if (!result[attendee.eventId]) {
			result[attendee.eventId] = [];
		}
		result[attendee.eventId].push(attendee);
	}

	return result;
}

export type FetchEventAttendeesResult = Awaited<
	ReturnType<typeof fetchEventAttendees>
>;


export const fetchOrganizers = async () => {
	const rls = await rlsClient();

	const allIdentities = await rls((tx) =>
		tx.select().from(identities)
	);

	return allIdentities.map((identity) => ({
		value: identity.id,
		displayName: identity.displayName,
		label: identity.displayName
			? `${identity.displayName} <${identity.value}>`
			: identity.value,
	}));
};


type UiGuest = {
	email: string;
	name: string | null;
	avatar: string | null;
	contactId: string | null;
	isOrganizer: boolean;
	isPersisted: boolean;
};

type AttendeePayload = {
	initialGuests?: UiGuest[];
	newGuests?: UiGuest[];
};

type SyncEventAttendeesArgs = {
	tx: PgTransaction<any, any, any>;
	eventId: string;
	organizerEmail: string | null;
	organizerName: string | null;
	attendeePayload: AttendeePayload | null;
};



export async function syncEventAttendees({
											 tx,
											 eventId,
											 organizerEmail,
											 organizerName,
											 attendeePayload,
										 }: SyncEventAttendeesArgs) {
	if (!attendeePayload) return;

	const allGuests: UiGuest[] = [
		...(attendeePayload.initialGuests ?? []),
		...(attendeePayload.newGuests ?? []),
	];

	const dedupedGuests = Array.from(
		new Map(allGuests.map((g) => [g.email.toLowerCase(), g])).values(),
	);

	const existing = await tx
		.select()
		.from(calendarEventAttendees)
		.where(eq(calendarEventAttendees.eventId, eventId));

	const existingByEmail = new Map(
		existing.map((a) => [a.email.toLowerCase(), a]),
	);

	const existingOrganizer = existing.find((a) => a.isOrganizer) ?? null;

	let normalizedOrganizer = organizerEmail?.toLowerCase() ?? null;

	const organizerGuestFromPayload =
		dedupedGuests.find((g) => g.isOrganizer) ??
		(normalizedOrganizer
			? dedupedGuests.find((g) => g.email.toLowerCase() === normalizedOrganizer)
			: undefined);

	if (!normalizedOrganizer && organizerGuestFromPayload) {
		normalizedOrganizer = organizerGuestFromPayload.email.toLowerCase();
	}

	if (!normalizedOrganizer && existingOrganizer) {
		normalizedOrganizer = existingOrganizer.email.toLowerCase();
	}

	if (!normalizedOrganizer) return;

	const desiredOrganizerName =
		organizerName ??
		organizerGuestFromPayload?.name ??
		existingOrganizer?.name ??
		null;

	const organizerMatch = existingByEmail.get(normalizedOrganizer) ?? null;

	const organizersToDemote = existing.filter(
		(a) => a.isOrganizer && a.email.toLowerCase() !== normalizedOrganizer,
	);

	if (organizersToDemote.length > 0) {
		await tx
			.update(calendarEventAttendees)
			.set({
				isOrganizer: false,
				role: "req_participant",
			})
			.where(
				inArray(
					calendarEventAttendees.id,
					organizersToDemote.map((o) => o.id),
				),
			);
	}

	if (!organizerMatch) {
		await tx.insert(calendarEventAttendees).values({
			eventId,
			email: normalizedOrganizer,
			name: desiredOrganizerName,
			isOrganizer: true,
			role: "chair",
			partstat: "accepted",
			rsvp: false,
		});
	} else {
		await tx
			.update(calendarEventAttendees)
			.set({
				isOrganizer: true,
				name: desiredOrganizerName,
				role: "chair",
			})
			.where(eq(calendarEventAttendees.id, organizerMatch.id));
	}

	const nonOrganizerGuests = dedupedGuests.filter(
		(g) => g.email.toLowerCase() !== normalizedOrganizer,
	);

	const desiredEmails = new Set(
		nonOrganizerGuests.map((g) => g.email.toLowerCase()),
	);

	const emailsToDelete = existing
		.filter((a) => !a.isOrganizer)
		.filter((a) => !desiredEmails.has(a.email.toLowerCase()))
		.map((a) => a.id);

	if (emailsToDelete.length > 0) {
		await tx
			.delete(calendarEventAttendees)
			.where(inArray(calendarEventAttendees.id, emailsToDelete));
	}

	for (const g of nonOrganizerGuests) {
		const key = g.email.toLowerCase();
		if (!existingByEmail.has(key)) {
			await tx.insert(calendarEventAttendees).values({
				eventId,
				email: g.email,
				name: g.name,
				isOrganizer: false,
				role: "req_participant",
				partstat: "needs_action",
				rsvp: false,
			});
		}
	}
}

export async function upsertCalendarEvent(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const decodedForm = decode(formData);

		const {
			tz,
			startsAt,
			endsAt,
			eventId,
			notifyAttendees,
			attendeePayload,
			isAllDay,
			recurrenceRule,
			...rest
		} = decodedForm;

		const notify = notifyAttendees === "on" || notifyAttendees === true;
		const isAllDayBool =
			isAllDay === "on" || isAllDay === true || isAllDay === "true";
		let rule =
			typeof recurrenceRule === "string" && recurrenceRule.trim().length > 0
				? recurrenceRule.trim()
				: null;

		let startsAtDate: Date;
		let endsAtDate: Date;

		if (isAllDayBool) {
			const startDay = dayjsExtended.tz(String(startsAt), String(tz));
			const endDay = dayjsExtended.tz(String(endsAt), String(tz));

			startsAtDate = startDay.startOf("day").toDate();
			endsAtDate = endDay.endOf("day").toDate();
		} else {
			startsAtDate = dayjsExtended
				.tz(String(startsAt), "YYYY-MM-DD HH:mm:ss", String(tz))
				.toDate();

			endsAtDate = dayjsExtended
				.tz(String(endsAt), "YYYY-MM-DD HH:mm:ss", String(tz))
				.toDate();
		}

		const rls = await rlsClient();

		let finalEventId: string | null = null;

		const attendeeData: AttendeePayload | null = attendeePayload
			? JSON.parse(String(attendeePayload))
			: null;

		await rls(async (tx) => {
			const [identityExists] = await tx
				.select()
				.from(identities)
				.where(eq(identities.id, String(decodedForm.organizerIdentityId)));

			const payload: any = {
				...rest,
				tz: String(tz),
				startsAt: startsAtDate,
				endsAt: endsAtDate,
				isAllDay: isAllDayBool,
				organizerEmail: identityExists ? identityExists.value : null,
				recurrenceRule: rule,
				organizerName: identityExists
					? identityExists.displayName
					: (decodedForm.newOrganizerName ?? null),
			};

			if (eventId && String(eventId).length > 0) {
				const parsedPayload = CalendarEventUpdateSchema.parse(payload);

				await tx
					.update(calendarEvents)
					.set(parsedPayload)
					.where(eq(calendarEvents.id, String(eventId)));

				finalEventId = String(eventId);
			} else {
				const parsedPayload = CalendarEventInsertSchema.parse(payload);
				const [calendarEvent] = await tx
					.insert(calendarEvents)
					.values(parsedPayload)
					.returning();

				finalEventId = calendarEvent.id;

				if (decodedForm.newOrganizerName) {
					await tx
						.update(identities)
						.set({ displayName: String(decodedForm.newOrganizerName) })
						.where(eq(identities.id, String(decodedForm.organizerIdentityId)));
				}
			}

			await syncEventAttendees({
				tx,
				eventId: finalEventId!,
				organizerEmail: payload.organizerEmail,
				organizerName: payload.organizerName,
				attendeePayload: attendeeData,
			});
		});

		if (!finalEventId) {
			throw new Error("Failed to persist calendar event");
		}

		const { davQueue } = await getRedis();
		await davQueue.add(
			eventId ? "dav:calendar:update-event" : "dav:calendar:create-event",
			{ eventId: finalEventId, notifyAttendees: notify },
		);

		revalidatePath("/dashboard/calendar");

		return { success: true };
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

export const searchContactsForCompose = async (
	searchValue: string,
) => {
	const q = searchValue.trim();
	if (!q) return [];

	const rls = await rlsClient();

	const prefix = `${q}%`;
	const emailLike = `%${q}%`;

	const rows = await rls((tx) =>
		tx
			.select({
				id: contacts.id,
				firstName: contacts.firstName,
				lastName: contacts.lastName,
				emails: contacts.emails,
				profilePictureXs: contacts.profilePictureXs,
			})
			.from(contacts)
			.innerJoin(
				addressBooks,
				eq(contacts.addressBookId, addressBooks.id),
			)
			.where(
				or(
					ilike(contacts.firstName, prefix),
					ilike(contacts.lastName, prefix),
					sql`${contacts.emails}::text ILIKE ${emailLike}`,
				),
			)
			.orderBy(contacts.lastName, contacts.firstName)
			.limit(10),
	);

	const suggestions: ComposeContact[] = [];
	for (const row of rows) {
		const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ");
		const emails = (row.emails ?? []) as { address: string }[];

		for (const e of emails) {
			if (!e.address) continue;
			let avatarUrl: string | null = null;

			if (row.profilePictureXs) {
				const command = new GetObjectCommand({
					Bucket: S3_BUCKET,
					Key: String(row.profilePictureXs),
				});
				avatarUrl = await getSignedUrl(s3, command, {
					expiresIn: 60
				});
			}
			suggestions.push({
				id: row.id,
				name: fullName || e.address,
				email: e.address,
				avatar: avatarUrl,
			});
		}
	}

	return suggestions.slice(0, 20);
};



export const getContactsForAttendeeIds = async (
	attendeeIds: string[],
) => {
	if (!attendeeIds?.length) return [];

	const rls = await rlsClient();

	const attendeesRows = await rls((tx) =>
		tx
			.select({
				attendeeId: calendarEventAttendees.id,
				email: calendarEventAttendees.email,
			})
			.from(calendarEventAttendees)
			.where(inArray(calendarEventAttendees.id, attendeeIds)),
	);

	if (!attendeesRows.length) return [];

	const emails = attendeesRows
		.map((a) => a.email?.trim().toLowerCase())
		.filter(Boolean) as string[];

	if (!emails.length) return [];

	const contactRows = await rls((tx) =>
		tx
			.select({
				id: contacts.id,
				firstName: contacts.firstName,
				lastName: contacts.lastName,
				emails: contacts.emails,
				profilePictureXs: contacts.profilePictureXs,
			})
			.from(contacts)
			.where(
				sql`EXISTS (
		SELECT 1
		FROM jsonb_array_elements(${contacts.emails}) AS e
				WHERE lower(e->>'address') IN (${sql.join(
					emails.map((e) => sql`${e}`),
					sql`,`
				)})
				)`
			),
	);

	const contactsByEmail = new Map<string, any>();

	for (const c of contactRows) {
		for (const e of c.emails || []) {
			const addr = String(e?.address ?? "")
				.trim()
				.toLowerCase();
			if (addr) {
				contactsByEmail.set(addr, c);
			}
		}
	}

	const results: ComposeContact[] = [];

	for (const attendee of attendeesRows) {
		const email = attendee.email?.trim().toLowerCase();
		if (!email) continue;

		const relatedContact = contactsByEmail.get(email) ?? null;

		const fullName = relatedContact
			? [relatedContact.firstName, relatedContact.lastName]
				.filter(Boolean)
				.join(" ")
			: null;

		let avatarUrl: string | null = null;

		if (relatedContact?.profilePictureXs) {
			const command = new GetObjectCommand({
				Bucket: S3_BUCKET,
				Key: String(relatedContact.profilePictureXs),
			});

			avatarUrl = await getSignedUrl(s3, command, {
				expiresIn: 60,
			});
		}

		results.push({
			id: attendee.attendeeId, // now attendeeId is canonical
			name: fullName || email,
			email,
			avatar: avatarUrl,
		});
	}

	return results;
};



export type FetchContactsForAttendeesResult = Awaited<
	ReturnType<typeof getContactsForAttendeeIds>
>;

export async function yesCalendarInvite(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const decodedForm = decode(formData) as {
			calendarId: string;
			eventId: string;
			attendeeId: string;
		};

		const { davQueue, davEvents } = await getRedis();
		const job = await davQueue.add("dav:calendar:itip-reply", {
			eventId: decodedForm.eventId,
			attendeeId: decodedForm.attendeeId,
			partstat: "accepted",
		});
		await job.waitUntilFinished(davEvents);
		revalidatePath("/dashboard/calendar");
		return { success: true };
	});
}

export async function noCalendarInvite(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const decodedForm = decode(formData) as {
			calendarId: string;
			eventId: string;
			attendeeId: string;
		};

		const { davQueue, davEvents } = await getRedis();
		const job = await davQueue.add("dav:calendar:itip-reply", {
			eventId: decodedForm.eventId,
			attendeeId: decodedForm.attendeeId,
			partstat: "declined",
		});
		await job.waitUntilFinished(davEvents);
		revalidatePath("/dashboard/calendar");
		return { success: true };
	});
}

export async function maybeCalendarInvite(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const decodedForm = decode(formData) as {
			calendarId: string;
			eventId: string;
			attendeeId: string;
		};

		const { davQueue, davEvents } = await getRedis();
		const job = await davQueue.add("dav:calendar:itip-reply", {
			eventId: decodedForm.eventId,
			attendeeId: decodedForm.attendeeId,
			partstat: "tentative",
		});
		await job.waitUntilFinished(davEvents);
		revalidatePath("/dashboard/calendar");
		return { success: true };
	});
}

export async function updateCalendarTimezone(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const decodedForm = decode(formData);
		const calendarId = String(decodedForm.calendarId);
		const timezone = String(decodedForm.timezone || "UTC");

		if (!calendarId) {
			return { success: false, error: "Missing calendarId" };
		}

		const rls = await rlsClient();
		await rls((tx) =>
			tx
				.update(calendars)
				.set({ timezone })
				.where(eq(calendars.id, calendarId)),
		);

		revalidatePath("/dashboard/calendar");
		return { success: true };
	});
}

export async function eventsByDayWithAllDay(
	tz: string,
	events: CalendarEventEntity[],
): Promise<{
	timedByDay: Map<string, EventSlotFragment[]>;
	allDayByDay: Map<string, AllDayFragment[]>;
}> {
	const base = await eventsByDay(tz, events);
	const timedByDay = new Map<string, EventSlotFragment[]>();
	const allDayByDay = new Map<string, AllDayFragment[]>();

	for (const [dayKey, frags] of base.entries()) {
		for (const frag of frags) {
			if (frag.event.isAllDay) {
				const bucket = allDayByDay.get(dayKey);
				const entry: AllDayFragment = {
					event: frag.event,
					date: dayKey,
					isStart: frag.isStart,
					isEnd: frag.isEnd,
				};
				if (bucket) bucket.push(entry);
				else allDayByDay.set(dayKey, [entry]);
			} else {
				const bucket = timedByDay.get(dayKey);
				if (bucket) bucket.push(frag);
				else timedByDay.set(dayKey, [frag]);
			}
		}
	}

	return { timedByDay, allDayByDay };
}

function toRRuleLocal(date: Date, tz: string): Date {
	const d = getDayjsTz(tz)(date);
	return new Date(
		Date.UTC(
			d.year(),
			d.month(),
			d.date(),
			d.hour(),
			d.minute(),
			d.second(),
			d.millisecond(),
		),
	);
}

function fromRRuleLocal(rruleDate: Date, tz: string): Date {
	const y = rruleDate.getUTCFullYear();
	const m = rruleDate.getUTCMonth();
	const d = rruleDate.getUTCDate();
	const h = rruleDate.getUTCHours();
	const mi = rruleDate.getUTCMinutes();
	const s = rruleDate.getUTCSeconds();
	const ms = rruleDate.getUTCMilliseconds();

	const zoned = getDayjsTz(tz)()
		.year(y)
		.month(m)
		.date(d)
		.hour(h)
		.minute(mi)
		.second(s)
		.millisecond(ms);

	return zoned.toDate();
}

export async function expandEventForRange(
	event: CalendarEventEntity,
	rangeStart: Date,
	rangeEnd: Date,
	tz: string,
): Promise<CalendarEventInstance[]> {
	if (!event.recurrenceRule) {
		return [
			{
				...event,
				instanceId: event.id,
				recurrenceMasterId: null,
			},
		];
	}

	const opts = RRule.parseString(event.recurrenceRule);
	const durationMs = event.endsAt.getTime() - event.startsAt.getTime();

	const isExternal = !!(event as any).isExternal;

	let dtstart: Date;
	let rStart: Date;
	let rEnd: Date;

	if (isExternal) {
		dtstart = event.startsAt;
		rStart = rangeStart;
		rEnd = rangeEnd;
	} else {
		dtstart = toRRuleLocal(event.startsAt, tz);
		rStart = toRRuleLocal(rangeStart, tz);
		rEnd = toRRuleLocal(rangeEnd, tz);
	}

	const rrule = new RRule({
		...opts,
		dtstart,
	});

	const rawDates = rrule.between(rStart, rEnd, true);

	if (!rawDates.length) {
		return [];
	}

	return rawDates.map((d, index) => {
		const startInstant = isExternal ? d : fromRRuleLocal(d, tz);
		const endInstant = new Date(startInstant.getTime() + durationMs);

		return {
			...event,
			instanceId: `${event.id}__${startInstant.toISOString()}__${index}`,
			recurrenceMasterId: event.id,
			startsAt: startInstant,
			endsAt: endInstant,
		};
	});
}

export async function expandEventsForRange(
	events: CalendarEventEntity[],
	rangeStart: Date,
	rangeEnd: Date,
	tz: string,
): Promise<CalendarEventInstance[]> {
	const all = await Promise.all(
		events.map((e) => expandEventForRange(e, rangeStart, rangeEnd, tz)),
	);
	return all.flat();
}

export async function fetchCalendarEventsForRange(
	calendarId: string,
	from: Date,
	to: Date,
): Promise<CalendarEventEntity[]> {
	const rls = await rlsClient();

	return rls((tx) =>
		tx
			.select()
			.from(calendarEvents)
			.where(
				and(
					eq(calendarEvents.calendarId, calendarId),
					or(
						and(
							isNull(calendarEvents.recurrenceRule),
							lte(calendarEvents.startsAt, to),
							gte(calendarEvents.endsAt, from),
						),
						and(
							not(isNull(calendarEvents.recurrenceRule)),
							lte(calendarEvents.startsAt, to),
						),
					),
				),
			),
	);
}

const isCalendar = (a: MessageAttachmentEntity) => {
	const ct = (a.contentType || "").toLowerCase();
	const fn = (a.filenameOriginal || "").toLowerCase();
	return (
		ct.includes("text/calendar") ||
		ct.includes("application/ics") ||
		ct.includes("application/octet-stream") && fn.endsWith(".ics") ||
		fn.endsWith(".ics") ||
		fn.endsWith(".calendar")
	);
};
function extractIcalUid(icsText: string): string | null {
	const unfolded = icsText.replace(/\r?\n[ \t]/g, "");
	const match = unfolded.match(/^UID:(.+)$/m);
	return match ? match[1].trim() : null;
}
export async function fetchEventPreviewItems(
	attachments: MessageAttachmentEntity[],
	identityPublicId: string,
) {
	const messageAttachment = attachments?.find(isCalendar);
	if (!messageAttachment) {
		return { calendarEvent: null, attendees: null, identity: null };
	}

	const command = new GetObjectCommand({
		Bucket: S3_BUCKET,
		Key: String(messageAttachment.path),
	});
	const response = await s3.send(command);
	const rawICS = response.Body
		? await response.Body.transformToString()
		: null;

	const uid = rawICS ? extractIcalUid(rawICS) : null;
	const rls = await rlsClient();

	const [calendarEvent] = await rls((tx) =>
		tx
			.select()
			.from(calendarEvents)
			.where(eq(calendarEvents.icalUid, String(uid)),)
	);

	if (!calendarEvent) {
		return { calendarEvent: null, attendees: null, identity: null };
	}

	const attendees = await rls((tx) =>
		tx
			.select()
			.from(calendarEventAttendees)
			.where(eq(calendarEventAttendees.eventId, calendarEvent.id))
	);

	const [identity] = await rls((tx) =>
		tx
			.select()
			.from(identities)
			.where(eq(identities.publicId, identityPublicId))
	);

	return { calendarEvent, attendees, identity }

}

export type FetchEventPreviewItemsResult = Awaited<
	ReturnType<typeof fetchEventPreviewItems>
>;
