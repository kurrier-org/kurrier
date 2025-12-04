import { CalendarEventEntity } from "@db";
import { getDayjsTz, VCAL_PRODID } from "@common";
import ICAL from "ical.js";

export function buildICalEvent(
    eventRow: CalendarEventEntity,
    dayjsTz: ReturnType<typeof getDayjsTz>,
): string {
    let vcal: ICAL.Component;
    let vevent: ICAL.Component;

    if (eventRow.rawIcs) {
        try {
            const parsed = ICAL.parse(eventRow.rawIcs);
            vcal = new ICAL.Component(parsed);
            vevent = vcal.getFirstSubcomponent("vevent") ?? new ICAL.Component("vevent");
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

        ev.startDate = ICAL.Time.fromDateString(startLocal.format("YYYYMMDD"));
        ev.endDate = ICAL.Time.fromDateString(endLocal.format("YYYYMMDD"));
    } else {
        const startUtc = dayjsTz(eventRow.startsAt).toDate();
        const endUtc = dayjsTz(eventRow.endsAt).toDate();

        ev.startDate = ICAL.Time.fromJSDate(startUtc, true); // UTC
        ev.endDate = ICAL.Time.fromJSDate(endUtc, true);
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

    return vcal.toString();
}
