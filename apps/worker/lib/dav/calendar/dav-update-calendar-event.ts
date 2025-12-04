import DigestFetch from "digest-fetch";
import {
	db,
	calendarEvents,
	calendars,
	davAccounts,
	secretsMeta,
	getSecretAdmin,
} from "@db";
import { desc, eq } from "drizzle-orm";
import { getDayjsTz } from "@common";
import { normalizeEtag } from "../sync/dav-sync-db";
import { buildICalEvent } from "./dav-build-cal-event";

export async function updateCalendarObjectViaHttp(opts: {
	icalData: string;
	davBaseUrl: string;
	username: string;
	password: string;
	collectionPath: string;
	davUri: string;
	etag?: string | null;
}) {
	const {
		icalData,
		davBaseUrl,
		username,
		password,
		collectionPath,
		davUri,
		etag,
	} = opts;

	const client = new DigestFetch(username, password);
	const digestFetch = client.fetch.bind(client);

	const base = davBaseUrl.replace(/\/$/, "");
	const collection = collectionPath.replace(/^\//, "");
	const url = `${base}/${collection}/${encodeURIComponent(davUri)}`;

	const headers: Record<string, string> = {
		"Content-Type": "text/calendar; charset=utf-8",
	};

	const ifMatch = etag ? `"${etag}"` : null;
	if (ifMatch) {
		headers["If-Match"] = ifMatch;
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
		console.error(
			`CalDAV PUT (update) failed (${res.status} ${res.statusText}): ${text}`,
		);
	}

	const newEtag = res.headers.get("etag") ?? null;
	return { etag: normalizeEtag(newEtag) };
}

export const updateCalendarEvent = async (eventId: string) => {
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

	if (!calendar) return null;

	const parts = calendar.remotePath.split("/");
	if (parts.length !== 3 || parts[0] !== "calendars") return null;

	const davUsername = parts[1];
	const davUri = event.davUri ?? `${event.id}.ics`;

	const [secretRow] = await db
		.select({
			account: davAccounts,
			metaId: secretsMeta.id,
		})
		.from(davAccounts)
		.where(eq(davAccounts.id, calendar.davAccountId))
		.leftJoin(secretsMeta, eq(davAccounts.secretId, secretsMeta.id))
		.orderBy(desc(davAccounts.createdAt));

	const secret = await getSecretAdmin(String(secretRow?.metaId));
	const passwordFromSecret = secret?.vault?.decrypted_secret;
	if (!passwordFromSecret) {
		console.error(
			"No password found in secret for DAV account",
			calendar.davAccountId,
		);
		return null;
	}

	const dayjsTz = getDayjsTz(calendar.timezone || "UTC");
	const icalData = buildICalEvent(event, dayjsTz);

	const { etag: newEtag } = await updateCalendarObjectViaHttp({
		icalData,
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: davUsername,
		password: passwordFromSecret,
		collectionPath: calendar.remotePath,
		davUri,
		etag: event.davEtag,
	});

	await db
		.update(calendarEvents)
		.set({
			davUri,
			davEtag: newEtag ?? event.davEtag,
			updatedAt: new Date(),
		})
		.where(eq(calendarEvents.id, event.id));

	return { success: true };
};
