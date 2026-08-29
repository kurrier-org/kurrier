"use server";
import { db, webPushSubscriptions } from "@db";
import { and, eq } from "drizzle-orm";
import { isSignedIn } from "./auth";

export async function getWebPushConfig() {
	if (!(await isSignedIn())) return { enabled: false, publicKey: null };
	const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
	if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT)
		return { enabled: false, publicKey: null };
	return { enabled: true, publicKey: VAPID_PUBLIC_KEY };
}

export async function saveWebPushSubscription(input: {
	endpoint: string;
	keys: { p256dh: string; auth: string };
	userAgent?: string;
}) {
	const user = await isSignedIn();
	if (!user) throw new Error("Not authenticated");
	if (!input?.endpoint || !input.keys?.p256dh || !input.keys?.auth)
		throw new Error("Invalid push subscription");
	await db
		.insert(webPushSubscriptions)
		.values({
			userId: user.id,
			endpoint: input.endpoint,
			p256dh: input.keys.p256dh,
			auth: input.keys.auth,
			userAgent: input.userAgent || null,
		})
		.onConflictDoUpdate({
			target: [webPushSubscriptions.userId, webPushSubscriptions.endpoint],
			set: {
				p256dh: input.keys.p256dh,
				auth: input.keys.auth,
				updatedAt: new Date(),
			},
		});
	return { success: true };
}

export async function removeWebPushSubscription(endpoint: string) {
	const user = await isSignedIn();
	if (!user) throw new Error("Not authenticated");
	await db
		.delete(webPushSubscriptions)
		.where(
			and(
				eq(webPushSubscriptions.userId, user.id),
				eq(webPushSubscriptions.endpoint, endpoint),
			),
		);
	return { success: true };
}
