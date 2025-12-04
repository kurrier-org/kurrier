import {
	db,
	calendarEvents,
	calendars,
	davAccounts,
	secretsMeta,
	getSecretAdmin,
} from "@db";
import { desc, eq } from "drizzle-orm";
import DigestFetch from "digest-fetch";

export async function deleteCalendarObjectViaHttp(opts: {
	davBaseUrl: string;
	username: string;
	password: string;
	collectionPath: string;
	davUri: string;
	etag?: string | null;
}) {
	const { davBaseUrl, username, password, collectionPath, davUri, etag } = opts;

	const client = new DigestFetch(username, password);
	const digestFetch = client.fetch.bind(client);

	const base = davBaseUrl.replace(/\/$/, "");
	const collection = collectionPath.replace(/^\//, "");
	const url = `${base}/${collection}/${encodeURIComponent(davUri)}`;

	const headers: Record<string, string> = {};
	const ifMatch = `"${etag}"`;
	if (etag) {
		headers["If-Match"] = ifMatch;
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
		console.error(
			`CalDAV DELETE failed (${res.status} ${res.statusText}): ${text}`,
		);
	}

	return { success: true };
}

export const deleteCalendarEvent = async (eventId: string) => {
	const [event] = await db
		.select()
		.from(calendarEvents)
		.where(eq(calendarEvents.id, eventId));

	if (!event) return;

	const [calendar] = await db
		.select()
		.from(calendars)
		.where(eq(calendars.id, event.calendarId));
	if (!calendar) return;

	const parts = calendar.remotePath.split("/");
	if (parts.length !== 3 || parts[0] !== "calendars") return;

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
		return;
	}

	await deleteCalendarObjectViaHttp({
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: davUsername,
		password: passwordFromSecret,
		collectionPath: calendar.remotePath,
		davUri,
		etag: event.davEtag,
	});

	await db.delete(calendarEvents).where(eq(calendarEvents.id, event.id));

	return { success: true };
};
