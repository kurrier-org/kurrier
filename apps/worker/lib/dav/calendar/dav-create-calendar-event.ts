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

async function createCalendarObjectViaHttp(opts: {
	icalData: string;
	davBaseUrl: string;
	username: string;
	password: string;
	collectionPath: string;
	davUri: string;
}) {
	const { icalData, davBaseUrl, username, password, collectionPath, davUri } =
		opts;

	const client = new DigestFetch(username, password);
	const digestFetch = client.fetch.bind(client);

	const base = davBaseUrl.replace(/\/$/, "");
	const collection = collectionPath.replace(/^\//, "");
	const url = `${base}/${collection}/${encodeURIComponent(davUri)}`;

	const res = await digestFetch(url, {
		method: "PUT",
		headers: {
			"Content-Type": "text/calendar; charset=utf-8",
			"If-None-Match": "*",
		},
		body: icalData,
	});

	if (!(res.status === 200 || res.status === 201 || res.status === 204)) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`CalDAV PUT failed (${res.status} ${res.statusText}): ${text}`,
		);
	}

	const etag = res.headers.get("etag") ?? null;
	return { etag };
}

export const createCalendarEvent = async (
	eventId: string,
	notifyAttendees: boolean,
	uid?: string,
) => {
	const [event] = await db
		.select()
		.from(calendarEvents)
		.where(eq(calendarEvents.id, eventId));

	if (!event) return;

	const [calendar] = await db
		.select()
		.from(calendars)
		.where(eq(calendars.id, event.calendarId));

	if (!calendar || !calendar.davAccountId) return;

	const [secretRow] = await db
		.select({
			username: davAccounts.username,
			metaId: secretsMeta.id,
		})
		.from(davAccounts)
		.where(eq(davAccounts.id, calendar.davAccountId))
		.leftJoin(secretsMeta, eq(davAccounts.secretId, secretsMeta.id));

	if (!secretRow?.metaId) return;



	const secret = await getSecretAdmin(String(secretRow.metaId));
	const password = secret?.vault?.decrypted_secret;
	if (!password) return;

	const guests = await db
		.select()
		.from(calendarEventAttendees)
		.where(eq(calendarEventAttendees.eventId, event.id));


	const dayjsTz = getDayjsTz(calendar.timezone || "UTC");
	const icalData = buildICalEvent(event, dayjsTz, guests);

	const davUri = `${event.id}.ics`;

	const { etag } = await createCalendarObjectViaHttp({
		icalData,
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: secretRow.username,
		password,
		collectionPath: `calendars/${secretRow.username}/${calendar.identityId}`,
		davUri,
	});

	await db
		.update(calendarEvents)
		.set({
			davUri,
			davEtag: normalizeEtag(etag),
			rawIcs: icalData,
			icalUid: uid ? uid : event.id,
			updatedAt: new Date(),
		})
		.where(eq(calendarEvents.id, event.id));

	if (notifyAttendees) {
		const { davWorkerQueue } = await getRedis();
		await davWorkerQueue.add("dav:calendar:itip-notify", {
			eventId: event.id,
			action: "create",
		});
	}

	return { success: true };
};
