import {
	db,
	calendarEvents,
	calendars,
	davAccounts,
	secretsMeta,
	getSecretAdmin,
} from "@db";
import { eq } from "drizzle-orm";
import DigestFetch from "digest-fetch";
import { getRedis } from "../../../lib/get-redis";

async function deleteCalendarObjectViaHttp(opts: {
	davBaseUrl: string;
	username: string;
	password: string;
	calendarSlug: string;
	davUri: string;
	etag?: string | null;
}) {
	const { davBaseUrl, username, password, calendarSlug, davUri, etag } = opts;

	const client = new DigestFetch(username, password);
	const digestFetch = client.fetch.bind(client);

	const base = davBaseUrl.replace(/\/$/, "");
	const url = `${base}/calendars/${username}/${calendarSlug}/${encodeURIComponent(
		davUri,
	)}`;

	const headers: Record<string, string> = {};

	if (etag) {
		headers["If-Match"] = `"${etag}"`;
	}

	let res = await digestFetch(url, {
		method: "DELETE",
		headers,
	});

	if (res.status === 412 && headers["If-Match"]) {
		delete headers["If-Match"];
		res = await digestFetch(url, {
			method: "DELETE",
			headers,
		});
	}

	if (res.status === 404) {
		return { success: true };
	}

	if (!(res.status === 200 || res.status === 204)) {
		const text = await res.text().catch(() => "");
		throw new Error(
			`CalDAV DELETE failed (${res.status} ${res.statusText}): ${text}`,
		);
	}

	return { success: true };
}

export const deleteCalendarEvent = async (
	eventId: string,
	notifyAttendees: boolean,
	deleteEvent: boolean,
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

	const davUri = event.davUri ?? `${event.id}.ics`;

	await deleteCalendarObjectViaHttp({
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: secretRow.username,
		password,
		calendarSlug: calendar.slug,
		davUri,
		etag: event.davEtag,
	});

	if (notifyAttendees) {
		const { davWorkerQueue } = await getRedis();
		await davWorkerQueue.add("dav:calendar:itip-notify", {
			eventId: event.id,
			action: "cancel",
		});
	}

	if (deleteEvent) {
		await db.delete(calendarEvents).where(eq(calendarEvents.id, event.id));
	}

	return { success: true };
};
