import {
    db,
    calendarEvents,
    calendarEventAttendees,
    identities,
    CalendarEventEntity,
    mailboxes, calendars,
} from "@db";
import { and, eq } from "drizzle-orm";
import ICAL from "ical.js";
import {EmailSendSchema, ItipAction} from "@schema";
import { createSupabaseServiceClient } from "../../../lib/create-client-ssr";
import { extension } from "mime-types";
import { base64ToBlob } from "@common";
import { getDayjsTz } from "@common";
import { getRedis } from "../../../lib/get-redis";
import { customAlphabet } from "nanoid";
const cleanId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

export const roleToIcs = (role: string | null) => {
    switch (role) {
        case "opt_participant":
            return "OPT-PARTICIPANT";
        case "non_participant":
            return "NON-PARTICIPANT";
        case "chair":
            return "CHAIR";
        case "req_participant":
        default:
            return "REQ-PARTICIPANT";
    }
};

export const partstatToIcs = (partstat: string | null) => {
    switch (partstat) {
        case "accepted":
            return "ACCEPTED";
        case "declined":
            return "DECLINED";
        case "tentative":
            return "TENTATIVE";
        case "delegated":
            return "DELEGATED";
        case "in_process":
            return "IN-PROCESS";
        case "completed":
            return "COMPLETED";
        case "needs_action":
        default:
            return "NEEDS-ACTION";
    }
};

export const davItipNotify = async (opts: {
    eventId: string;
    action?: ItipAction;
}): Promise<void> => {
    const { eventId, action = "create" } = opts;

    console.info("davItipNotify: start", { eventId, action });

    const [event] = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.id, eventId));

    if (!event) {
        console.warn("davItipNotify: event not found", { eventId });
        return;
    }
    if (!event.rawIcs) {
        console.warn("davItipNotify: event has no rawIcs", { eventId });
        return;
    }

    const attendees = await db
        .select()
        .from(calendarEventAttendees)
        .where(eq(calendarEventAttendees.eventId, eventId));

    const realAttendees = attendees.filter((a) => !a.isOrganizer);
    if (realAttendees.length === 0) {
        console.info("davItipNotify: no non-organizer attendees, skipping", {
            eventId,
        });
        return;
    }

    const organizerIdentity = event.organizerIdentityId
        ? (
            await db
                .select()
                .from(identities)
                .where(eq(identities.id, event.organizerIdentityId))
        )[0]
        : null;

    const organizerEmail =
        event.organizerEmail ?? organizerIdentity?.value ?? null;
    const organizerName =
        event.organizerName ??
        organizerIdentity?.displayName ??
        organizerEmail;

    if (!organizerEmail) {
        console.warn("davItipNotify: no organizerEmail", { eventId });
        return;
    }

    let vcal: ICAL.Component;
    let vevent: ICAL.Component | null = null;

    try {
        const parsed = ICAL.parse(event.rawIcs);
        vcal = new ICAL.Component(parsed);
        vevent = vcal.getFirstSubcomponent("vevent");
    } catch (e) {
        console.error("davItipNotify: failed to parse rawIcs", { eventId, e });
        return;
    }

    if (!vevent) {
        console.warn("davItipNotify: no VEVENT in rawIcs", { eventId });
        return;
    }

    const icalEvent = new ICAL.Event(vevent);

    if (!vcal.getFirstProperty("prodid")) {
        vcal.addPropertyWithValue("prodid", "-//Kurrier//Calendar 1.0//EN");
    }
    if (!vcal.getFirstProperty("version")) {
        vcal.addPropertyWithValue("version", "2.0");
    }
    if (!vcal.getFirstProperty("calscale")) {
        vcal.addPropertyWithValue("calscale", "GREGORIAN");
    }

    vcal.getAllProperties("method").forEach((p) => vcal.removeProperty(p));
    const icalMethod = action === "cancel" ? "CANCEL" : "REQUEST";
    vcal.addPropertyWithValue("method", icalMethod);

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

    if (action === "cancel") {
        const statusProp = vevent.getFirstProperty("status");
        if (statusProp) {
            statusProp.setValue("CANCELLED");
        } else {
            vevent.addPropertyWithValue("status", "CANCELLED");
        }
    }

    vevent.getAllProperties("organizer").forEach((p) =>
        vevent!.removeProperty(p),
    );
    vevent.getAllProperties("attendee").forEach((p) =>
        vevent!.removeProperty(p),
    );

    const organizerProp = vevent.addPropertyWithValue(
        "organizer",
        `mailto:${organizerEmail}`,
    );
    if (organizerName) {
        organizerProp.setParameter("cn", organizerName);
    }



    const [calendar] = await db
        .select()
        .from(calendars)
        .where(eq(calendars.id, event.calendarId));
    const tzid = calendar?.timezone || "UTC";
    const dayjsTz = getDayjsTz(tzid);
    const startLocal = dayjsTz(event.startsAt);
    const endLocal = dayjsTz(event.endsAt);
    let humanWhen: string;
    if (event.isAllDay) {
        if (startLocal.isSame(endLocal, "day")) {
            humanWhen = `${startLocal.format("D MMM YYYY")} (all day)`;
        } else {
            humanWhen = `${startLocal.format("D MMM YYYY")} – ${endLocal.format(
                "D MMM YYYY",
            )} (all day)`;
        }
    } else if (startLocal.isSame(endLocal, "day")) {
        humanWhen = `${startLocal.format("D MMM YYYY")} ${startLocal.format(
            "h:mm A",
        )} – ${endLocal.format("h:mm A")} (${tzid})`;
    } else {
        humanWhen = `${startLocal.format(
            "D MMM YYYY h:mm A",
        )} – ${endLocal.format("D MMM YYYY h:mm A")} (${tzid})`;
    }




    for (const attendee of realAttendees) {
        const addr = attendee.email.trim();
        if (!addr) continue;

        const p = vevent.addPropertyWithValue("attendee", `mailto:${addr}`);
        if (attendee.name) p.setParameter("cn", attendee.name);

        p.setParameter("role", roleToIcs(attendee.role));
        p.setParameter("partstat", partstatToIcs(attendee.partstat));
        p.setParameter("rsvp", attendee.rsvp ? "TRUE" : "FALSE");
    }

    const icsText = vcal.toString();

    for (const attendee of realAttendees) {
        const addr = attendee.email.trim();
        if (!addr) continue;

        await enqueEmail({
            event,
            icsText,
            humanWhen,
            toAddresses: [addr],
            organizerEmail,
            organizerName,
            action,
        });
    }

    console.info("davItipNotify: done", { eventId, action });
};

const enqueEmail = async ({
                              event,
                              icsText,
                              humanWhen,
                              toAddresses,
                              organizerEmail,
                              organizerName,
                              action,
                          }: {
    event: CalendarEventEntity;
    icsText: string;
    humanWhen: string;
    toAddresses: string[];
    organizerEmail: string;
    organizerName: string | null;
    action: ItipAction;
}) => {
    const identityId = event.organizerIdentityId;
    if (!identityId) {
        console.warn("enqueEmail: event has no organizerIdentityId", {
            eventId: event.id,
        });
        return;
    }

    const [identity] = await db
        .select()
        .from(identities)
        .where(eq(identities.id, identityId));

    if (!identity) {
        console.warn("enqueEmail: identity not found", {
            eventId: event.id,
            identityId,
        });
        return;
    }

    const [sentMailbox] = await db
        .select()
        .from(mailboxes)
        .where(
            and(eq(mailboxes.identityId, identityId), eq(mailboxes.slug, "sent")),
        );

    if (!sentMailbox) {
        console.warn("enqueEmail: sent mailbox not found", {
            eventId: event.id,
            identityId,
        });
        return;
    }

    const subjectBase = event.title || "(no title)";
    const displayName = organizerName || organizerEmail;

    const subjectPrefix =
        action === "cancel"
            ? "Cancelled: "
            : action === "update"
                ? "Updated invitation: "
                : "Invitation: ";

    const introLine =
        action === "cancel"
            ? `The event ${subjectBase} has been cancelled by ${displayName}.`
            : action === "update"
                ? `The event "${subjectBase}" has been updated by ${displayName}.`
                : `You have been invited to: ${subjectBase} by ${displayName}.`;

    const toLine = toAddresses.join(",");

    const mimeMethod = action === "cancel" ? "CANCEL" : "REQUEST";

    const data = {
        identityId: identityId,
        to: toLine,
        subject: `${subjectPrefix}${subjectBase}`,
        text: `${introLine}\n\nWhen: ${humanWhen}`,
        html: `<p>${introLine}</p><p><strong>When:</strong> ${humanWhen}</p>`,
        attachments: [
            {
                filename: `invite-${cleanId(4)}.ics`,
                contentType: `text/calendar; charset=utf-8; method=${mimeMethod}`,
                content: Buffer.from(icsText, "utf8").toString("base64"),
            },
        ],
    };

    const parsed = EmailSendSchema.safeParse(data);
    if (!parsed.success) {
        console.error("enqueEmail: EmailSendSchema validation failed", {
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
        const path = `private/${identity.ownerId}/${newMessageId}/invite-${cleanId(4)}.${ext}`;
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
            console.error("enqueEmail: failed to upload attachment", {
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
