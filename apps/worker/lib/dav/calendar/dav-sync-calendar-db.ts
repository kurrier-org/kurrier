import {
    db,
    calendars,
    calendarEvents,
    CalendarEventEntity, CalendarEventInsertSchema, CalendarEntity, CalendarEventUpdateSchema,
} from "@db";
import { and, eq } from "drizzle-orm";
import { davCalendarObjects, DavCalendarObjectEntity, davDb } from "../dav-schema";
import ICAL from "ical.js";
import { normalizeEtag } from "../sync/dav-sync-db";
import { getDayjsTz } from "@common";
import {CalendarEventStatusType} from "@schema";

const fetchIcsData = async (obj: DavCalendarObjectEntity) => {
    const bytes = obj.calendardata as Uint8Array;
    return Buffer.from(bytes).toString("utf8");
};

export function parseIcsToEvent(
    icsData: string,
    calendar: CalendarEntity,
): Partial<CalendarEventEntity> | null {
    const jcal = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcal);

    const vevent = comp.getFirstSubcomponent("vevent");
    if (!vevent) return null;

    const ev = new ICAL.Event(vevent);

    const startTime = ev.startDate;
    const endTime = ev.endDate;
    if (!startTime || !endTime) return null;

    const eventTzid = (startTime.zone && (startTime.zone as any).tzid) || null;
    const tzId = calendar.timezone || eventTzid || "UTC";
    const dayjsTz = getDayjsTz(tzId);

    const isAllDay = !!startTime.isDate;

    let startsAt: Date;
    let endsAt: Date;

    if (isAllDay) {
        const s = dayjsTz({
            year: startTime.year,
            month: startTime.month - 1,
            day: startTime.day,
            hour: 0,
            minute: 0,
            second: 0,
        });

        const e = dayjsTz({
            year: endTime.year,
            month: endTime.month - 1,
            day: endTime.day,
            hour: 0,
            minute: 0,
            second: 0,
        });

        startsAt = s.toDate();
        endsAt = e.toDate();
    } else {
        const startZone = startTime.zone as any;
        const isFloating =
            !startZone ||
            startZone === ICAL.Timezone.localTimezone ||
            startZone.tzid === "floating";

        if (isFloating) {
            const s = dayjsTz({
                year: startTime.year,
                month: startTime.month - 1,
                day: startTime.day,
                hour: startTime.hour,
                minute: startTime.minute,
                second: startTime.second,
            });

            const e = dayjsTz({
                year: endTime.year,
                month: endTime.month - 1,
                day: endTime.day,
                hour: endTime.hour,
                minute: endTime.minute,
                second: endTime.second,
            });

            startsAt = s.toDate();
            endsAt = e.toDate();
        } else {
            startsAt = startTime.toJSDate();
            endsAt = endTime.toJSDate();
        }
    }

    const title = ev.summary || "";
    const description = ev.description || "";
    const location = (vevent.getFirstPropertyValue("location") as string | null) ?? null;

    const rawStatus = (vevent.getFirstPropertyValue("status") as string | null) ?? null;
    let status: CalendarEventStatusType | null = "confirmed";
    if (rawStatus) {
        switch (rawStatus.toUpperCase()) {
            case "CONFIRMED":
                status = "confirmed";
                break;
            case "TENTATIVE":
                status = "tentative";
                break;
            case "CANCELLED":
                status = "cancelled";
                break;
            default:
                status = "confirmed";
        }
    }

    const transp = (vevent.getFirstPropertyValue("transp") as string | null) ?? null;

    const busyStatus = transp && transp.toUpperCase() === "TRANSPARENT" ? "free" : "busy";

    return {
        title,
        description,
        location,
        isAllDay,
        startsAt,
        endsAt,
        status,
        busyStatus,
    } as Partial<CalendarEventEntity>;
}


const createEventFromDav = async (opts: {
    obj: DavCalendarObjectEntity;
    calendar: CalendarEntity;
}) => {
    const { obj, calendar } = opts;
    const ics = await fetchIcsData(obj);
    const parsed = parseIcsToEvent(ics, calendar);
    if (!parsed) return null;

    const payload = CalendarEventInsertSchema.safeParse({
        ownerId: calendar.ownerId,
        calendarId: calendar.id,

        title: parsed.title ?? "",
        description: parsed.description ?? null,
        location: parsed.location ?? null,
        isAllDay: parsed.isAllDay ?? false,
        startsAt: parsed.startsAt!,
        endsAt: parsed.endsAt!,

        status: parsed.status ?? null,
        busyStatus: parsed.busyStatus ?? "busy",

        davUri: obj.uri,
        davEtag: normalizeEtag(obj.etag),
        rawIcs: ics
    })

    if(!payload.success) {
        console.error("[DAV CAL SYNC] Failed to parse calendar event from DAV object:", payload.error);
        return null;
    }

    const [inserted] = await db
        .insert(calendarEvents)
        .values(payload.data)
        .onConflictDoNothing()
        .returning();

    return inserted;
};

const updateEventFromDav = async (opts: {
    obj: DavCalendarObjectEntity;
    calendar: CalendarEntity;
    localEvent: CalendarEventEntity;
}) => {
    const { obj, calendar, localEvent } = opts;
    const ics = await fetchIcsData(obj);
    const parsed = parseIcsToEvent(ics, calendar);
    if (!parsed) return localEvent;

    const payload = CalendarEventUpdateSchema.safeParse({
        ...parsed,
        davUri: obj.uri,
        davEtag: normalizeEtag(obj.etag),
        rawIcs: ics,
        updatedAt: new Date(),
    });

    if(!payload.success) {
        console.error("[DAV CAL SYNC] Failed to parse calendar event from DAV object:", payload.error);
        return null;
    }

    const [updated] = await db
        .update(calendarEvents)
        .set(payload.data)
        .where(eq(calendarEvents.id, localEvent.id))
        .returning();

    return updated;
};

const syncCalendar = async (calendar: CalendarEntity, defaultDavCalendarId: number | null) => {
    const parts = calendar.remotePath.split("/");
    if (parts.length !== 3 || parts[0] !== "calendars") return;

    const davCalendarId = calendar.davCalendarId || defaultDavCalendarId;
    if (!davCalendarId) {
        console.info("[DAV CAL SYNC] Skipping calendar without davCalendarId", calendar.id);
        return;
    }

    const objs = await davDb
        .select()
        .from(davCalendarObjects)
        .where(eq(davCalendarObjects.calendarid, davCalendarId));

    const remoteUris = new Set<string>();

    for (const obj of objs) {
        remoteUris.add(obj.uri);

        const [localEvent] = await db
            .select()
            .from(calendarEvents)
            .where(
                and(
                    eq(calendarEvents.calendarId, calendar.id),
                    eq(calendarEvents.davUri, obj.uri),
                ),
            );

        if (localEvent) {
            if (normalizeEtag(obj.etag) !== localEvent.davEtag) {
                await updateEventFromDav({ obj, calendar, localEvent });
            }
        } else {
            console.info(
                "[DAV CAL SYNC] New event from DAV:",
                obj.uri,
                "-> calendar",
                calendar.id,
            );
            await createEventFromDav({ obj, calendar });
        }
    }

    const localEvents = await db
        .select()
        .from(calendarEvents)
        .where(eq(calendarEvents.calendarId, calendar.id));

    const deletedIds: string[] = [];

    for (const local of localEvents) {
        if (local.davUri && !remoteUris.has(local.davUri)) {
            await db.delete(calendarEvents).where(eq(calendarEvents.id, local.id));
            deletedIds.push(String(local.id));
        }
    }

    if (deletedIds.length) {
        console.info("[DAV CAL SYNC] Deleted local events removed remotely:", {
            calendarId: calendar.id,
            count: deletedIds.length,
            ids: deletedIds,
        });
    }
};

export const davSyncCalendarsDb = async () => {
    const cals = await db
        .select()
        .from(calendars)
        .where(eq(calendars.isDefault, true));

    if (!cals.length) {
        console.info("[DAV CAL SYNC] No DAV calendars found.");
        return;
    }

    for (const cal of cals) {
        try {
            await syncCalendar(cal as CalendarEntity, cal.davCalendarId);
        } catch (err: any) {
            console.error(
                "[DAV CAL SYNC] Error syncing calendar",
                cal.id,
                err?.message ?? err,
            );
        }
    }

    console.info("[DAV CAL SYNC] Completed.");
};
