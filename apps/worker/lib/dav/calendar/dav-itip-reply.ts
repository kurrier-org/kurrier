import {
	db,
	calendarEvents,
	calendarEventAttendees,
	identities,
	mailboxes,
	CalendarEventEntity,
} from "@db";
import { and, eq, sql } from "drizzle-orm";
import ICAL from "ical.js";
import { EmailSendSchema } from "@schema";
import { createSupabaseServiceClient } from "../../../lib/create-client-ssr";
import { extension } from "mime-types";
import { base64ToBlob } from "@common";
import { getRedis } from "../../../lib/get-redis";
import { customAlphabet } from "nanoid";
import { partstatToIcs } from "./dav-itip-notify";

const cleanId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

type DbPartstat = "accepted" | "declined" | "tentative";

export const davItipReply = async (opts: {
	eventId: string;
	attendeeId: string;
	partstat: DbPartstat;
}): Promise<void> => {
	const { eventId, attendeeId, partstat } = opts;

	console.info("davItipReply: start", { eventId, attendeeId, partstat });

	const [event] = await db
		.select()
		.from(calendarEvents)
		.where(eq(calendarEvents.id, eventId));

	if (!event) {
		console.warn("davItipReply: event not found", { eventId });
		return;
	}

	if (!event.rawIcs) {
		console.warn("davItipReply: event has no rawIcs", { eventId });
		return;
	}

	if (!event.isExternal) {
		console.info("davItipReply: event is not external, skipping", {
			eventId,
		});
		return;
	}

	if (!event.organizerEmail) {
		console.warn("davItipReply: event has no organizerEmail", { eventId });
		return;
	}

	const [attendee] = await db
		.select()
		.from(calendarEventAttendees)
		.where(
			and(
				eq(calendarEventAttendees.id, attendeeId),
				eq(calendarEventAttendees.eventId, eventId),
			),
		);

	if (!attendee) {
		console.warn("davItipReply: attendee not found", {
			eventId,
			attendeeId,
		});
		return;
	}

	await db
		.update(calendarEventAttendees)
		.set({ partstat })
		.where(eq(calendarEventAttendees.id, attendeeId));

	const responderEmail = attendee.email.trim().toLowerCase();
	if (!responderEmail) {
		console.warn("davItipReply: attendee has no email", {
			eventId,
			attendeeId,
		});
		return;
	}

	const [identity] = await db
		.select()
		.from(identities)
		.where(
			and(
				eq(identities.ownerId, event.ownerId),
				sql`lower(${identities.value}) = ${responderEmail}`,
			),
		);

	if (!identity) {
		console.warn("davItipReply: identity not found for attendee email", {
			eventId,
			attendeeId,
			responderEmail,
		});
		return;
	}

	const responderName = attendee.name || identity.displayName || responderEmail;

	let vcal: ICAL.Component;
	let vevent: ICAL.Component | null = null;

	try {
		const parsed = ICAL.parse(event.rawIcs);
		vcal = new ICAL.Component(parsed);
		vevent = vcal.getFirstSubcomponent("vevent");
	} catch (e) {
		console.error("davItipReply: failed to parse rawIcs", { eventId, e });
		return;
	}

	if (!vevent) {
		console.warn("davItipReply: no VEVENT in rawIcs", { eventId });
		return;
	}

	const icalEvent = new ICAL.Event(vevent);

	vcal.addPropertyWithValue("prodid", "-//Kurrier//Calendar 1.0//EN");
	vcal.addPropertyWithValue("version", "2.0");
	vcal.addPropertyWithValue("calscale", "GREGORIAN");

	vcal.getAllProperties("method").forEach((p) => vcal.removeProperty(p));
	vcal.addPropertyWithValue("method", "REPLY");

	const now = ICAL.Time.fromJSDate(new Date(), true);
	const dtstampProp = vevent.getFirstProperty("dtstamp");
	if (dtstampProp) {
		dtstampProp.setValue(now);
	} else {
		vevent.addPropertyWithValue("dtstamp", now);
	}

	if (!icalEvent.uid) {
		icalEvent.uid = event.davUri || event.id;
	}

	let organizerProp = vevent.getFirstProperty("organizer");
	if (!organizerProp && event.organizerEmail) {
		organizerProp = vevent.addPropertyWithValue(
			"organizer",
			`mailto:${event.organizerEmail}`,
		);
		if (event.organizerName) {
			organizerProp.setParameter("cn", event.organizerName);
		}
	}

	const responderEmailLower = responderEmail.toLowerCase();
	const originalAttendees = vevent.getAllProperties("attendee") || [];
	let originalResponderProp: ICAL.Property | null = null;

	for (const p of originalAttendees) {
		const rawVal = p.getFirstValue();
		const raw = String(rawVal ?? "").toLowerCase();
		const addr = raw.startsWith("mailto:") ? raw.slice("mailto:".length) : raw;
		if (addr === responderEmailLower) {
			originalResponderProp = p;
			break;
		}
	}

	originalAttendees.forEach((p) => vevent.removeProperty(p));
	let responderProp: ICAL.Property;
	if (originalResponderProp) {
		const jcal = (originalResponderProp as any).toJSON();
		responderProp = new (ICAL as any).Property(jcal);
	} else {
		responderProp = new (ICAL as any).Property("attendee");
		responderProp.setValue(`mailto:${responderEmail}`);
		if (responderName) {
			responderProp.setParameter("cn", responderName);
		}
	}

	responderProp.setParameter("partstat", partstatToIcs(partstat));
	responderProp.setParameter("rsvp", "FALSE");
	vevent.addProperty(responderProp);

	const icsText = vcal.toString();

	await enqueueItipReplyEmail({
		event,
		icsText,
		identity,
		responderEmail,
		responderName,
		partstat,
	});
};

const enqueueItipReplyEmail = async ({
	event,
	icsText,
	identity,
	responderEmail,
	responderName,
	partstat,
}: {
	event: CalendarEventEntity;
	icsText: string;
	identity: typeof identities.$inferSelect;
	responderEmail: string;
	responderName: string | null;
	partstat: DbPartstat;
}) => {
	const [sentMailbox] = await db
		.select()
		.from(mailboxes)
		.where(
			and(eq(mailboxes.identityId, identity.id), eq(mailboxes.slug, "sent")),
		);

	if (!sentMailbox) {
		console.warn("enqueueItipReplyEmail: sent mailbox not found", {
			eventId: event.id,
			identityId: identity.id,
		});
		return;
	}

	const subjectBase = event.title || "(no title)";
	const humanWhen = `${event.startsAt.toISOString()} – ${event.endsAt.toISOString()}`;
	const displayName = responderName || responderEmail;

	const subjectPrefix =
		partstat === "accepted"
			? "Accepted: "
			: partstat === "declined"
				? "Declined: "
				: "Tentative: ";

	const introLine =
		partstat === "accepted"
			? `${displayName} has accepted the invitation "${subjectBase}".`
			: partstat === "declined"
				? `${displayName} has declined the invitation "${subjectBase}".`
				: `${displayName} has marked the invitation "${subjectBase}" as tentative.`;

	const data = {
		identityId: identity.id,
		to: event.organizerEmail!,
		subject: `${subjectPrefix}${subjectBase}`,
		text: `${introLine}\n\nWhen: ${humanWhen}`,
		html: `<p>${introLine}</p><p><strong>When:</strong> ${humanWhen}</p>`,
		attachments: [
			{
				filename: `reply-${cleanId(4)}.ics`,
				contentType: "text/calendar; charset=utf-8; method=REPLY",
				content: Buffer.from(icsText, "utf8").toString("base64"),
			},
		],
	};

	const parsed = EmailSendSchema.safeParse(data);
	if (!parsed.success) {
		console.error("enqueueItipReplyEmail: EmailSendSchema validation failed", {
			eventId: event.id,
			issues: parsed.error.issues,
			data,
		});
		return;
	}

	const emailData = parsed.data;
	const newMessageId = crypto.randomUUID();

	const supabase = await createSupabaseServiceClient();
	const storedAttachments: any[] = [];

	for (const file of emailData.attachments || []) {
		const ext = extension(file.contentType) || "dat";
		const path = `private/${identity.ownerId}/${newMessageId}/reply-${cleanId(
			4,
		)}.${ext}`;
		const blob = base64ToBlob(file.content, file.contentType);

		const { error: e } = await supabase.storage
			.from("attachments")
			.upload(path, blob);

		if (!e) {
			storedAttachments.push({
				path,
				messageId: newMessageId,
				bucketId: "attachments",
				filenameOriginal: file.filename,
				contentType: file.contentType,
			});
		} else {
			console.error("enqueueItipReplyEmail: failed to upload attachment", {
				eventId: event.id,
				error: e,
			});
		}
	}

	const payload: any = {
		newMessageId,
		messageMailboxId: "",
		sentMailboxId: String(sentMailbox.id),
		mailboxId: String(sentMailbox.id),
		mode: "compose",
		...emailData,
		attachments: JSON.stringify(storedAttachments),
	};

	const { sendMailQueue } = await getRedis();
	await sendMailQueue.add("send-and-reconcile", payload);
};
