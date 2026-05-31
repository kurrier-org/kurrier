import {
	db,
	calendarEvents,
	calendars,
	calendarEventAttendees, davAccounts, secretsMeta, getSecretAdmin,
} from "@db";
import { eq } from "drizzle-orm";
import { getDayjsTz } from "@common";
import { buildICalEvent } from "./dav-build-cal-event";
import { getRedis } from "../../../lib/get-redis";
import DigestFetch from "digest-fetch";
import {normalizeEtag} from "../../../lib/dav/sync/dav-sync-db";

async function updateCalendarObjectViaHttp(opts: {
	icalData: string;
	davBaseUrl: string;
	username: string;
	password: string;
	calendarSlug: string;
	davUri: string;
	etag?: string | null;
}) {
	const { icalData, davBaseUrl, username, password, calendarSlug, davUri, etag } =
		opts;

	const client = new DigestFetch(username, password);
	const digestFetch = client.fetch.bind(client);

	const base = davBaseUrl.replace(/\/$/, "");
	const url = `${base}/calendars/${username}/${calendarSlug}/${encodeURIComponent(
		davUri,
	)}`;

	const headers: Record<string, string> = {
		"Content-Type": "text/calendar; charset=utf-8",
	};

	if (etag) {
		headers["If-Match"] = `"${etag}"`;
	}

	let res = await digestFetch(url, {
		method: "PUT",
		headers,
		body: icalData,
	});

	if (res.status === 412 && headers["If-Match"]) {
		delete headers["If-Match"];
		res = await digestFetch(url, {
			method: "PUT",
			headers,
			body: icalData,
		});
	}

	if (!(res.status === 200 || res.status === 204)) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`CalDAV PUT (update) failed (${res.status} ${res.statusText}): ${text}`,
		);
	}

	const newEtag = res.headers.get("etag") ?? null;
	return { etag: normalizeEtag(newEtag) };
}




export const updateCalendarEvent = async (
	eventId: string,
	notifyAttendees: boolean,
) => {
	const [event] = await db
		.select()
		.from(calendarEvents)
		.where(eq(calendarEvents.id, eventId));

	if (!event) return null;

	// Use the event's calendar
	const [calendar] = await db
		.select()
		.from(calendars)
		.where(eq(calendars.id, event.calendarId));

	if (!calendar || !calendar.davAccountId) return null;

	const [secretRow] = await db
		.select({
			username: davAccounts.username,
			metaId: secretsMeta.id,
		})
		.from(davAccounts)
		.where(eq(davAccounts.id, calendar.davAccountId))
		.leftJoin(secretsMeta, eq(davAccounts.secretId, secretsMeta.id));

	if (!secretRow?.metaId) return null;

	const secret = await getSecretAdmin(String(secretRow.metaId));
	const password = secret?.vault?.decrypted_secret;
	if (!password) return null;



	const guests = await db
		.select()
		.from(calendarEventAttendees)
		.where(eq(calendarEventAttendees.eventId, event.id));

	const dayjsTz = getDayjsTz(calendar.timezone || "UTC");
	const icalData = buildICalEvent(event, dayjsTz, guests);

	const davUri = event.davUri ?? `${event.id}.ics`;

	const { etag: newEtag } = await updateCalendarObjectViaHttp({
		icalData,
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: secretRow.username,
		password,
		calendarSlug: calendar.slug,
		davUri,
		etag: event.davEtag,
	});


	await db
		.update(calendarEvents)
		.set({
			davUri,
			davEtag: newEtag ?? event.davEtag,
			rawIcs: icalData,
			updatedAt: new Date(),
		})
		.where(eq(calendarEvents.id, event.id));

	if (notifyAttendees) {
		const { davWorkerQueue } = await getRedis();
		await davWorkerQueue.add("dav:calendar:itip-notify", {
			eventId: event.id,
			action: "update",
		});
	}

	return { success: true };
};
