import { CalendarEventEntity } from "@db";
import { getDayjsTz, VCAL_PRODID } from "@common";
import ICAL from "ical.js";

export function buildICalEvent(
	eventRow: CalendarEventEntity,
	dayjsTz: ReturnType<typeof getDayjsTz>,
): string {
	const vcal = new ICAL.Component(["vcalendar", [], []]);
	vcal.addPropertyWithValue("prodid", VCAL_PRODID);
	vcal.addPropertyWithValue("version", "2.0");
	vcal.addPropertyWithValue("calscale", "GREGORIAN");

	const vevent = new ICAL.Component("vevent");
	const ev = new ICAL.Event(vevent);

	ev.uid = eventRow.id;
	ev.summary = eventRow.title ?? "";

	if (eventRow.description) {
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

		ev.startDate = ICAL.Time.fromJSDate(startUtc, true);
		ev.endDate = ICAL.Time.fromJSDate(endUtc, true);
	}

	vevent.addPropertyWithValue(
		"dtstamp",
		ICAL.Time.fromJSDate(new Date(), true),
	);

	vcal.addSubcomponent(vevent);

	return vcal.toString();
}
