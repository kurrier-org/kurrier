import { CalendarEventAttendeeEntity, CalendarEventEntity } from "@db";
import { VCAL_PRODID } from "@common";
import { getDayjsTz } from "@common";
import ICAL from "ical.js";

function mapRoleToIcal(role?: string | null): string {
    switch (role) {
        case "chair":
            return "CHAIR";
        case "opt_participant":
            return "OPT-PARTICIPANT";
        case "non_participant":
            return "NON-PARTICIPANT";
        case "req_participant":
        default:
            return "REQ-PARTICIPANT";
    }
}

function mapPartstatToIcal(partstat?: string | null): string {
    if (!partstat) return "NEEDS-ACTION";
    return partstat.replace(/_/g, "-").toUpperCase();
}

export function buildICalEvent(
    eventRow: CalendarEventEntity,
    dayjsTz: ReturnType<typeof getDayjsTz>,
    guests?: CalendarEventAttendeeEntity[],
): string {
    let vcal: ICAL.Component;
    let vevent: ICAL.Component;

    if (eventRow.rawIcs) {
        try {
            const parsed = ICAL.parse(eventRow.rawIcs);
            vcal = new ICAL.Component(parsed);
            vevent =
                vcal.getFirstSubcomponent("vevent") ??
                new ICAL.Component("vevent");
            if (!vcal.getFirstSubcomponent("vevent")) {
                vcal.addSubcomponent(vevent);
            }
        } catch {
            vcal = new ICAL.Component(["vcalendar", [], []]);
            vcal.addPropertyWithValue("prodid", VCAL_PRODID);
            vcal.addPropertyWithValue("version", "2.0");
            vcal.addPropertyWithValue("calscale", "GREGORIAN");
            vevent = new ICAL.Component("vevent");
            vcal.addSubcomponent(vevent);
        }
    } else {
        vcal = new ICAL.Component(["vcalendar", [], []]);
        vcal.addPropertyWithValue("prodid", VCAL_PRODID);
        vcal.addPropertyWithValue("version", "2.0");
        vcal.addPropertyWithValue("calscale", "GREGORIAN");
        vevent = new ICAL.Component("vevent");
        vcal.addSubcomponent(vevent);
    }

    const ev = new ICAL.Event(vevent);

    if (!ev.uid) {
        ev.uid = eventRow.id;
    }

    ev.summary = eventRow.title ?? "";

    if (typeof eventRow.description === "string") {
        ev.description = eventRow.description;
    }




    const allDay = Boolean(eventRow.isAllDay);
    if (allDay) {
        const startLocal = dayjsTz(eventRow.startsAt);
        const endLocal = dayjsTz(eventRow.endsAt);
        const startDate = ICAL.Time.fromData({
            year: startLocal.year(),
            month: startLocal.month() + 1,
            day: startLocal.date(),
            isDate: true,
        });
        const endExclusive = endLocal.add(1, "day");
        const endDate = ICAL.Time.fromData({
            year: endExclusive.year(),
            month: endExclusive.month() + 1,
            day: endExclusive.date(),
            isDate: true,
        });
        ev.startDate = startDate;
        ev.endDate = endDate;
    } else {
        const startUtc = dayjsTz(eventRow.startsAt).toDate();
        const endUtc = dayjsTz(eventRow.endsAt).toDate();
        ev.startDate = ICAL.Time.fromJSDate(startUtc, true);
        ev.endDate = ICAL.Time.fromJSDate(endUtc, true);
    }



    vevent.removeAllProperties("rrule");
    if (eventRow.recurrenceRule && eventRow.recurrenceRule.trim().length > 0) {
        const recur = ICAL.Recur.fromString(eventRow.recurrenceRule.trim());
        vevent.addPropertyWithValue("rrule", recur);
    }




    const now = ICAL.Time.fromJSDate(new Date(), true);
    const dtstampProp = vevent.getFirstProperty("dtstamp");
    if (dtstampProp) {
        dtstampProp.setValue(now);
    } else {
        vevent.addPropertyWithValue("dtstamp", now);
    }

    if (eventRow.rawIcs) {
        const currentSeq = typeof ev.sequence === "number" ? ev.sequence : 0;
        ev.sequence = currentSeq + 1;
    }

    vevent.removeAllProperties("organizer");
    vevent.removeAllProperties("attendee");

    const attendees = guests ?? [];

    const organizerGuest =
        attendees.find((g) => g.isOrganizer) ?? null;

    const organizerEmail =
        (eventRow.organizerEmail ?? organizerGuest?.email ?? "")
            .trim()
            .toLowerCase() || null;

    const shouldDefaultRsvp = !eventRow.isExternal;
    const shouldUseServerScheduleAgent = !eventRow.isExternal;

    if (organizerEmail) {
        const organizerName =
            eventRow.organizerName ?? organizerGuest?.name ?? null;

        const orgProp = new ICAL.Property("organizer");
        orgProp.setValue(`mailto:${organizerEmail}`);
        if (organizerName) {
            orgProp.setParameter("cn", organizerName);
        }
        if (shouldUseServerScheduleAgent) {
            orgProp.setParameter("schedule-agent", "SERVER");
        }
        vevent.addProperty(orgProp);
    }

    const organizerEmailLower = organizerEmail ?? "";


    for (const g of attendees) {
        const email = g.email?.trim();
        if (!email) continue;

        if (email.toLowerCase() === organizerEmailLower) continue;

        const prop = new ICAL.Property("attendee");
        prop.setValue(`mailto:${email}`);

        if (g.name) {
            prop.setParameter("cn", g.name);
        }

        prop.setParameter("role", mapRoleToIcal(g.role));
        prop.setParameter("partstat", mapPartstatToIcal(g.partstat));

        const wantsRsvp = shouldDefaultRsvp
            ? g.rsvp !== false
            : g.rsvp === true;

        if (wantsRsvp) {
            prop.setParameter("rsvp", "TRUE");
        }

        if (shouldUseServerScheduleAgent) {
            prop.setParameter("schedule-agent", "SERVER");
        }

        vevent.addProperty(prop);
    }

    return vcal.toString();
}
