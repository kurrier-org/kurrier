import DigestFetch from "digest-fetch";
import {
	db,
	davAccounts,
	secretsMeta,
	getSecretAdmin,
	calendarEvents,
	calendars,
} from "@db";
import { and, desc, eq } from "drizzle-orm";
import { getDayjsTz } from "@common";
import { normalizeEtag } from "../sync/dav-sync-db";
import { buildICalEvent } from "./dav-build-cal-event";

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

export const createCalendarEvent = async (eventId: string) => {
	const [event] = await db
		.select()
		.from(calendarEvents)
		.where(eq(calendarEvents.id, eventId));

	if (!event) return;

	const [calendar] = await db
		.select()
		.from(calendars)
		.where(
			and(eq(calendars.ownerId, event.ownerId), eq(calendars.isDefault, true)),
		);

	if (!calendar) return;

	const parts = calendar.remotePath.split("/");
	if (parts.length !== 3 || parts[0] !== "calendars") return;

	const davUsername = parts[1];

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
		return;
	}

	const dayjsTz = getDayjsTz(calendar.timezone || "UTC");
	const icalData = buildICalEvent(event, dayjsTz);
	const davUri = `${event.id}.ics`;
	const { etag } = await createCalendarObjectViaHttp({
		icalData,
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: davUsername,
		password: passwordFromSecret,
		collectionPath: calendar.remotePath,
		davUri,
	});

	await db
		.update(calendarEvents)
		.set({
			davUri,
			davEtag: normalizeEtag(etag),
			updatedAt: new Date(),
		})
		.where(eq(calendarEvents.id, event.id));

	return { success: true };
};
