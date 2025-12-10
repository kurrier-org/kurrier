import ICAL from "ical.js";
import {
	db,
	messages,
	messageAttachments,
	calendarEvents,
	calendarEventAttendees,
	mailboxes,
	identities,
	calendars,
	CalendarEventInsertSchema,
	CalendarEventUpdateSchema,
	CalendarEventAttendeeInsertSchema,
	contacts,
} from "@db";
import { and, eq, or, sql } from "drizzle-orm";
import { createSupabaseServiceClient } from "../../../lib/create-client-ssr";
import { getRedis } from "../../../lib/get-redis";
import { dayjsExtended } from "@common";

export type DavItipIngestItem = {
	messageId: string;
	messageAttachmentId: string;
	mailboxId: string;
};

type DbPartstat =
	| "accepted"
	| "declined"
	| "tentative"
	| "delegated"
	| "in_process"
	| "completed"
	| "needs_action";

type DbRole =
	| "chair"
	| "opt_participant"
	| "non_participant"
	| "req_participant";

const icsPartstatToDb = (partstatRaw: string | null): DbPartstat => {
	const v = (partstatRaw || "").toUpperCase();

	switch (v) {
		case "ACCEPTED":
			return "accepted";
		case "DECLINED":
			return "declined";
		case "TENTATIVE":
			return "tentative";
		case "DELEGATED":
			return "delegated";
		case "IN-PROCESS":
			return "in_process";
		case "COMPLETED":
			return "completed";
		case "NEEDS-ACTION":
		default:
			return "needs_action";
	}
};

const icsRoleToDb = (roleRaw: string | null): DbRole => {
	const v = (roleRaw || "REQ-PARTICIPANT").toUpperCase();

	switch (v) {
		case "CHAIR":
			return "chair";
		case "OPT-PARTICIPANT":
			return "opt_participant";
		case "NON-PARTICIPANT":
			return "non_participant";
		case "REQ-PARTICIPANT":
		default:
			return "req_participant";
	}
};

export function normaliseItipRequestToVevent(itip: string): string {
	const parsed = ICAL.parse(itip);
	const vcal = new ICAL.Component(parsed);
	vcal.removeAllProperties("method");
	const vevent = vcal.getFirstSubcomponent("vevent");
	if (!vevent) return vcal.toString();
	const event = new ICAL.Event(vevent);
	if (typeof event.sequence !== "number") {
		event.sequence = 0;
	}
	const attendees = vevent.getAllProperties("attendee");
	attendees.forEach((att) => {
		att.removeParameter("rsvp");
	});
	const organizer = vevent.getFirstProperty("organizer");
	if (organizer) {
		const value = organizer.getFirstValue();
		if (value && !String(value).startsWith("mailto:")) {
			organizer.setValue("mailto:" + value);
		}
	}
	const cleanVcal = new ICAL.Component("vcalendar");
	const incomingProdid = vcal.getFirstPropertyValue("prodid") as
		| string
		| undefined;
	cleanVcal.addPropertyWithValue(
		"prodid",
		incomingProdid || "-//Kurrier//Calendar//EN",
	);
	cleanVcal.addPropertyWithValue("version", "2.0");
	cleanVcal.addSubcomponent(vevent);

	return cleanVcal.toString();
}

export async function davItipProcessor(
	items: DavItipIngestItem[],
): Promise<void> {
	if (!items.length) return;

	const supabase = await createSupabaseServiceClient();

	for (const item of items) {
		try {
			await processSingleItem(supabase, item);
		} catch (err) {
			console.error("davItipProcessor: failed item", {
				item,
				error: (err as any)?.message ?? err,
			});
		}
	}
}

async function processSingleItem(
	supabase: Awaited<ReturnType<typeof createSupabaseServiceClient>>,
	item: DavItipIngestItem,
) {
	const { messageId, messageAttachmentId, mailboxId } = item;

	const [msg] = await db
		.select({ id: messages.id, ownerId: messages.ownerId })
		.from(messages)
		.where(eq(messages.id, messageId));

	if (!msg) {
		console.warn("davItipProcessor: message not found", { messageId });
		return;
	}

	const [mb] = await db
		.select({ id: mailboxes.id, slug: mailboxes.slug })
		.from(mailboxes)
		.where(eq(mailboxes.id, mailboxId));

	if (!mb) {
		console.warn("davItipProcessor: mailbox not found", { mailboxId });
		return;
	}

	if (mb.slug === "sent") {
		return;
	}

	const [att] = await db
		.select()
		.from(messageAttachments)
		.where(eq(messageAttachments.id, messageAttachmentId));

	if (!att) {
		console.warn("davItipProcessor: attachment not found", {
			messageAttachmentId,
		});
		return;
	}

	const { data: file, error } = await supabase.storage
		.from(att.bucketId)
		.download(att.path);

	if (error || !file) {
		console.error("davItipProcessor: failed to download ICS", {
			messageAttachmentId,
			error,
		});
		return;
	}

	const icsText = await (file as any).text();

	let vcal: ICAL.Component;
	let vevent: ICAL.Component | null = null;

	try {
		const parsed = ICAL.parse(icsText);
		vcal = new ICAL.Component(parsed);
		vevent = vcal.getFirstSubcomponent("vevent");
	} catch (e) {
		console.error("davItipProcessor: failed to parse ICS", { e });
		return;
	}

	if (!vevent) {
		console.warn("davItipProcessor: no VEVENT in ICS");
		return;
	}

	const methodProp = vcal.getFirstProperty("method");
	const method = (
		(methodProp?.getFirstValue() as string | undefined) || "REQUEST"
	).toUpperCase();

	if (method === "REQUEST") {
		await handleIncomingRequest({
			msg,
			mailboxId,
			vevent,
			vcalString: icsText,
		});
		return;
	}

	if (method === "CANCEL") {
		await handleIncomingCancel({
			msg,
			mailboxId,
			vevent,
		});
		return;
	}

	if (method !== "REPLY") {
		return;
	}

	const uid =
		(vevent.getFirstPropertyValue("uid") as string | undefined) || null;

	if (!uid) {
		console.warn("davItipProcessor: REPLY missing UID");
		return;
	}

	const attendeeProps = vevent.getAllProperties("attendee") || [];
	if (!attendeeProps.length) {
		console.warn("davItipProcessor: REPLY has no ATTENDEE", { uid });
		return;
	}

	const attendeeUpdates = attendeeProps
		.map((p) => {
			const rawVal = p.getFirstValue();
			const rawMailto = String(rawVal ?? "").toLowerCase();
			const email = rawMailto.startsWith("mailto:")
				? rawMailto.slice("mailto:".length)
				: rawMailto;

			if (!email) return null;

			const psParam = p.getParameter("partstat");
			const partstatParam =
				typeof psParam === "string"
					? psParam
					: Array.isArray(psParam)
						? psParam[0]
						: null;

			const dbPartstat = icsPartstatToDb(partstatParam);

			return { email, dbPartstat };
		})
		.filter((x): x is { email: string; dbPartstat: DbPartstat } => !!x);

	if (!attendeeUpdates.length) {
		console.warn("davItipProcessor: REPLY ATTENDEE list has no valid emails", {
			uid,
		});
		return;
	}

	const [event] = await db
		.select()
		.from(calendarEvents)
		.where(
			and(
				eq(calendarEvents.ownerId, msg.ownerId),
				or(
					eq(calendarEvents.davUri, uid),
					eq(calendarEvents.id, uid as any),
					eq(calendarEvents.icalUid, uid as any),
				),
			),
		);

	if (!event) {
		console.warn("davItipProcessor: no matching event for UID", {
			uid,
			ownerId: msg.ownerId,
		});
		return;
	}

	let anyUpdated = false;

	for (const { email, dbPartstat } of attendeeUpdates) {
		const updated = await db
			.update(calendarEventAttendees)
			.set({ partstat: dbPartstat })
			.where(
				and(
					eq(calendarEventAttendees.eventId, event.id),
					eq(calendarEventAttendees.email, email),
				),
			)
			.returning();

		if (!updated.length) {
			console.warn("davItipProcessor: attendee not found on event", {
				eventId: event.id,
				email,
				partstat: dbPartstat,
			});
			continue;
		}

		anyUpdated = true;

		console.info("davItipProcessor: updated attendee partstat", {
			eventId: event.id,
			email,
			partstat: dbPartstat,
		});
	}

	if (anyUpdated) {
		const { davWorkerQueue } = await getRedis();
		await davWorkerQueue.add("dav:calendar:update-event", {
			eventId: event.id,
			notifyAttendees: false,
		});
	}
}

async function handleIncomingCancel({
	msg,
	mailboxId,
	vevent,
}: {
	msg: { id: string; ownerId: string };
	mailboxId: string;
	vevent: ICAL.Component;
}) {
	const [mailbox] = await db
		.select({
			id: mailboxes.id,
			identityId: mailboxes.identityId,
		})
		.from(mailboxes)
		.where(eq(mailboxes.id, mailboxId));

	if (!mailbox?.identityId) {
		console.warn("handleIncomingCancel: mailbox has no identity", {
			mailboxId,
		});
		return;
	}

	const [identity] = await db
		.select({
			id: identities.id,
			value: identities.value,
			ownerId: identities.ownerId,
		})
		.from(identities)
		.where(eq(identities.id, mailbox.identityId));

	if (!identity) {
		console.warn("handleIncomingCancel: identity not found", {
			identityId: mailbox.identityId,
		});
		return;
	}

	const myEmail = identity.value.trim().toLowerCase();

	const attendeesProps = vevent.getAllProperties("attendee") || [];
	const isForMe = attendeesProps.some((p) => {
		const rawVal = p.getFirstValue();
		const raw = String(rawVal ?? "").toLowerCase();
		const addr = raw.startsWith("mailto:") ? raw.slice("mailto:".length) : raw;
		return addr === myEmail;
	});

	if (!isForMe) {
		return;
	}

	const ev = new ICAL.Event(vevent);
	const uid = ev.uid;
	if (!uid) {
		console.warn("handleIncomingCancel: CANCEL missing UID");
		return;
	}

	const [existing] = await db
		.select()
		.from(calendarEvents)
		.where(eq(calendarEvents.icalUid, uid));

	if (!existing) {
		console.warn("handleIncomingCancel: no matching event for UID", {
			uid,
			ownerId: msg.ownerId,
		});
		return;
	}

	const eventId = existing.id;
	const { davWorkerQueue } = await getRedis();
	await davWorkerQueue.add("dav:calendar:delete-event", {
		eventId,
		notifyAttendees: false,
		deleteEvent: true,
	});
}

async function handleIncomingRequest({
	msg,
	mailboxId,
	vevent,
	vcalString,
}: {
	msg: { id: string; ownerId: string };
	mailboxId: string;
	vevent: ICAL.Component;
	vcalString: string;
}) {
	const [mailbox] = await db
		.select({
			id: mailboxes.id,
			identityId: mailboxes.identityId,
		})
		.from(mailboxes)
		.where(eq(mailboxes.id, mailboxId));

	if (!mailbox?.identityId) {
		console.warn("handleIncomingRequest: mailbox has no identity", {
			mailboxId,
		});
		return;
	}

	const [identity] = await db
		.select({
			id: identities.id,
			value: identities.value,
			ownerId: identities.ownerId,
		})
		.from(identities)
		.where(eq(identities.id, mailbox.identityId));

	if (!identity) {
		console.warn("handleIncomingRequest: identity not found", {
			identityId: mailbox.identityId,
		});
		return;
	}

	const myEmail = identity.value.trim().toLowerCase();

	const attendeesProps = vevent.getAllProperties("attendee") || [];
	const isForMe = attendeesProps.some((p) => {
		const rawVal = p.getFirstValue();
		const raw = String(rawVal ?? "").toLowerCase();
		const addr = raw.startsWith("mailto:") ? raw.slice("mailto:".length) : raw;
		return addr === myEmail;
	});

	if (!isForMe) {
		return;
	}

	const [calendar] = await db
		.select()
		.from(calendars)
		.where(
			and(eq(calendars.ownerId, msg.ownerId), eq(calendars.isDefault, true)),
		);

	if (!calendar) {
		console.warn("handleIncomingRequest: no default calendar for owner", {
			ownerId: msg.ownerId,
		});
		return;
	}

	await applyIncomingRequest({
		ownerId: msg.ownerId,
		calendarId: calendar.id,
		vcalString,
		vevent,
	});
}

async function applyIncomingRequest({
	ownerId,
	calendarId,
	vcalString,
	vevent,
}: {
	ownerId: string;
	calendarId: string;
	vcalString: string;
	vevent: ICAL.Component;
}) {
	const ev = new ICAL.Event(vevent);

	const isAllDay = ev.startDate.isDate;
	let startsAtJs: Date;
	let endsAtJs: Date;
	if (isAllDay) {
		const startJs = ev.startDate.toJSDate();
		const endExclusiveJs = ev.endDate
			? ev.endDate.toJSDate()
			: dayjsExtended(startJs).add(1, "day").toDate();
		const startDay = dayjsExtended(startJs).startOf("day");
		const endInclusive = dayjsExtended(endExclusiveJs)
			.subtract(1, "day")
			.endOf("day");
		startsAtJs = startDay.toDate();
		endsAtJs = endInclusive.toDate();
	} else {
		startsAtJs = ev.startDate.toJSDate();
		endsAtJs = ev.endDate.toJSDate();
	}

	let recurrenceRule: string | null = null;
	const rruleProp = vevent.getFirstProperty("rrule");
	if (rruleProp) {
		const recur = rruleProp.getFirstValue() as any;
		if (recur && typeof recur.toString === "function") {
			recurrenceRule = recur.toString();
		} else if (recur) {
			recurrenceRule = String(recur);
		}
	}

	const uid = ev.uid;
	if (!uid) return;

	const organizerProp = vevent.getFirstProperty("organizer");
	const organizerRaw = organizerProp?.getFirstValue();
	const organizerEmail = organizerProp
		? String(organizerRaw ?? "")
				.replace(/^mailto:/i, "")
				.trim()
				.toLowerCase()
		: null;

	const cnParam = organizerProp?.getParameter("cn") as
		| string
		| string[]
		| undefined;
	const organizerName =
		typeof cnParam === "string"
			? cnParam
			: Array.isArray(cnParam)
				? (cnParam[0] ?? null)
				: null;

	const attendeesProps = vevent.getAllProperties("attendee") ?? [];
	const attendees = attendeesProps.map((p) => {
		const rawVal = p.getFirstValue();
		const email = String(rawVal ?? "")
			.replace(/^mailto:/i, "")
			.trim()
			.toLowerCase();

		const cn = p.getParameter("cn") as string | string[] | undefined;
		const name =
			typeof cn === "string" ? cn : Array.isArray(cn) ? (cn[0] ?? null) : null;

		const roleParam = p.getParameter("role") as string | string[] | undefined;
		const roleStr =
			typeof roleParam === "string"
				? roleParam
				: Array.isArray(roleParam)
					? roleParam[0]
					: "REQ-PARTICIPANT";

		const partstatParam = p.getParameter("partstat") as
			| string
			| string[]
			| undefined;
		const partstatStr =
			typeof partstatParam === "string"
				? partstatParam
				: Array.isArray(partstatParam)
					? partstatParam[0]
					: "NEEDS-ACTION";

		const rsvpParam = p.getParameter("rsvp") as string | string[] | undefined;
		const rsvpStr =
			typeof rsvpParam === "string"
				? rsvpParam
				: Array.isArray(rsvpParam)
					? rsvpParam[0]
					: "";

		return {
			email,
			name,
			role: icsRoleToDb(roleStr),
			partstat: icsPartstatToDb(partstatStr),
			rsvp: rsvpStr.toUpperCase() === "TRUE",
		};
	});

	const emailToContactId = await ensureContactsForAttendees(ownerId, attendees);
	const { davWorkerQueue } = await getRedis();

	const [existing] = await db
		.select()
		.from(calendarEvents)
		.where(
			and(
				eq(calendarEvents.ownerId, ownerId),
				or(
					eq(calendarEvents.davUri, `${uid}.ics`),
					eq(calendarEvents.davUri, uid),
					eq(calendarEvents.icalUid, uid),
				),
			),
		);

	let eventId: string;

	if (!existing) {
		const insertPayload = CalendarEventInsertSchema.safeParse({
			ownerId,
			calendarId,
			title: ev.summary || "(no title)",
			description: ev.description || null,

			startsAt: startsAtJs,
			endsAt: endsAtJs,
			isAllDay,
			recurrenceRule,

			organizerEmail,
			organizerName,
			davUri: `${uid}.ics`,
			rawIcs: normaliseItipRequestToVevent(vcalString),
			isExternal: true,
			icalUid: uid,
		});

		if (insertPayload.error) {
			console.error("applyIncomingRequest: invalid insert payload");
			return;
		}

		const [row] = await db
			.insert(calendarEvents)
			.values(insertPayload.data)
			.returning();

		eventId = row.id;

		await davWorkerQueue.add("dav:calendar:create-event", {
			eventId,
			notifyAttendees: false,
		});
	} else {
		eventId = existing.id;

		const updatePayload = CalendarEventUpdateSchema.safeParse({
			title: ev.summary || existing.title,
			description: ev.description ?? existing.description,

			startsAt: startsAtJs,
			endsAt: endsAtJs,
			isAllDay,
			recurrenceRule,

			organizerEmail,
			organizerName,
			rawIcs: normaliseItipRequestToVevent(vcalString),
		});

		if (updatePayload.error) {
			console.error("applyIncomingRequest: invalid update payload");
			return;
		}

		await db
			.update(calendarEvents)
			.set(updatePayload.data)
			.where(eq(calendarEvents.id, existing.id));

		await davWorkerQueue.add("dav:calendar:update-event", {
			eventId,
			notifyAttendees: false,
		});
	}

	await db
		.delete(calendarEventAttendees)
		.where(eq(calendarEventAttendees.eventId, eventId));

	for (const a of attendees) {
		const contactId = emailToContactId[a.email.trim().toLowerCase()];

		const insertAttendeePayload = CalendarEventAttendeeInsertSchema.safeParse({
			ownerId,
			eventId,
			email: a.email,
			name: a.name,
			contactId,
			role: a.role,
			partstat: a.partstat,
			rsvp: a.rsvp,
			isOrganizer: a.email === organizerEmail,
		});

		if (insertAttendeePayload.error) {
			console.error("applyIncomingRequest: invalid attendee insert payload");
			continue;
		}
		insertAttendeePayload.data.metaData = null;
		await db
			.insert(calendarEventAttendees)
			// @ts-ignore
			// Fixme: Drizzle types are broken for .values() with safeParse
			.values(insertAttendeePayload.data);
	}

	return eventId;
}

type SimpleAttendeeForContact = {
	email: string;
	name: string | null;
};

export async function ensureContactsForAttendees(
	ownerId: string,
	attendees: SimpleAttendeeForContact[],
): Promise<Record<string, string>> {
	const byEmail = new Map<string, SimpleAttendeeForContact>();

	for (const a of attendees) {
		const email = a.email.trim().toLowerCase();
		if (!email) continue;
		if (!byEmail.has(email)) {
			byEmail.set(email, { email, name: a.name ?? null });
		}
	}

	const emailToContactId: Record<string, string> = {};

	for (const [email, attendee] of byEmail.entries()) {
		const [existing] = await db
			.select({ id: contacts.id })
			.from(contacts)
			.where(
				and(
					eq(contacts.ownerId, ownerId),
					sql`EXISTS (
                        SELECT 1
                        FROM jsonb_array_elements(${contacts.emails}) AS e
                        WHERE lower(e->>'address') = ${email}
                    )`,
				),
			);

		if (existing) {
			emailToContactId[email] = existing.id;
			continue;
		}

		const rawName = attendee.name?.trim() || "";
		let firstName: string;
		let lastName: string | null = null;

		if (rawName) {
			const parts = rawName.split(/\s+/);
			firstName = parts[0] || email.split("@")[0] || "Unknown";
			lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
		} else {
			const local = email.split("@")[0] || "Unknown";
			firstName = local;
			lastName = null;
		}

		const [inserted] = await db
			.insert(contacts)
			.values({
				ownerId,
				firstName,
				lastName,
				emails: [{ address: email }],
			})
			.returning({ id: contacts.id });

		emailToContactId[email] = inserted.id;
	}

	return emailToContactId;
}
