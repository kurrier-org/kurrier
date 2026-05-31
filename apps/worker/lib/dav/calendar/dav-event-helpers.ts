import {CalendarEventAttendeeInsertSchema, calendarEventAttendees, db} from "@db";
import {eq} from "drizzle-orm";
import {DbPartstat, DbRole, icsPartstatToDb, icsRoleToDb} from "../../../lib/dav/calendar/dav-itip-processor";
import ICAL from "ical.js";

export type ParsedVeventParticipants = {
    organizerEmail: string | null;
    organizerName: string | null;
    attendees: Array<{
        email: string;
        name: string | null;
        role: DbRole;
        partstat: DbPartstat;
        rsvp: boolean;
    }>;
};

export function parseVeventParticipants(
    vevent: ICAL.Component,
): ParsedVeventParticipants {
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
                ? cnParam[0] ?? null
                : null;

    const attendeeProps = vevent.getAllProperties("attendee") ?? [];

    const attendees = attendeeProps
        ?.map((p) => {
            const rawVal = p.getFirstValue();
            const email = String(rawVal ?? "")
                .replace(/^mailto:/i, "")
                .trim()
                .toLowerCase();

            if (!email) return null;

            const cn = p.getParameter("cn") as string | string[] | undefined;
            const name =
                typeof cn === "string"
                    ? cn
                    : Array.isArray(cn)
                        ? cn[0] ?? null
                        : null;

            const roleParam = p.getParameter("role") as
                | string
                | string[]
                | undefined;

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

            const rsvpParam = p.getParameter("rsvp") as
                | string
                | string[]
                | undefined;

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
        })
        .filter(
            (
                x,
            ): x is {
                email: string;
                name: string | null;
                role: DbRole;
                partstat: DbPartstat;
                rsvp: boolean;
            } => !!x,
        );

    return {
        organizerEmail,
        organizerName,
        attendees,
    };
}


export async function syncEventAttendeesFromVevent(opts: {
    eventId: string;
    ownerId: string;
    workspaceId: string;
    vevent: ICAL.Component;
}) {
    const { eventId, ownerId, workspaceId, vevent } = opts;

    const {
        organizerEmail,
        organizerName,
        attendees,
    } = parseVeventParticipants(vevent);

    await db
        .delete(calendarEventAttendees)
        .where(eq(calendarEventAttendees.eventId, eventId));

    for (const a of attendees) {
        const insertPayload = CalendarEventAttendeeInsertSchema.safeParse({
            ownerId,
            eventId,
            workspaceId,
            email: a.email,
            name: a.name,
            role: a.role,
            partstat: a.partstat,
            rsvp: a.rsvp,
            isOrganizer:
                organizerEmail !== null &&
                a.email === organizerEmail,
        });

        if (insertPayload.error) {
            console.error("syncEventAttendeesFromVevent: invalid payload");
            continue;
        }

        insertPayload.data.metaData = null;

        await db.insert(calendarEventAttendees).values(
            // @ts-ignore
            insertPayload.data,
        );
    }

    return {
        organizerEmail,
        organizerName,
        attendeesCount: attendees.length,
    };
}
