"use server";
import {
	MAX_SUBSCRIPTIONS_PER_USER,
	validateWebPushSubscription,
} from "@common";
import { db, webPushSubscriptions } from "@db";
import { and, count, eq, sql } from "drizzle-orm";
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
	const subscription = await validateWebPushSubscription(input);
	await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
		const [existing] = await tx
			.select({ id: webPushSubscriptions.id })
			.from(webPushSubscriptions)
			.where(
				and(
					eq(webPushSubscriptions.userId, user.id),
					eq(webPushSubscriptions.endpoint, subscription.endpoint),
				),
			)
			.limit(1);
		if (!existing) {
			const [{ value }] = await tx
				.select({ value: count() })
				.from(webPushSubscriptions)
				.where(eq(webPushSubscriptions.userId, user.id));
			if (value >= MAX_SUBSCRIPTIONS_PER_USER)
				throw new Error("Web Push subscription limit reached");
		}
		await tx
			.insert(webPushSubscriptions)
			.values({
				userId: user.id,
				endpoint: subscription.endpoint,
				p256dh: subscription.keys.p256dh,
				auth: subscription.keys.auth,
				userAgent: input.userAgent || null,
			})
			.onConflictDoUpdate({
				target: [webPushSubscriptions.userId, webPushSubscriptions.endpoint],
				set: {
					p256dh: subscription.keys.p256dh,
					auth: subscription.keys.auth,
					updatedAt: new Date(),
				},
			});
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
