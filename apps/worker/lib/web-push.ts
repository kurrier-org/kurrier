import { db, webPushDeliveries, webPushSubscriptions } from "@db";
import type { Queue } from "bullmq";
import { and, eq, sql } from "drizzle-orm";
import webpush from "web-push";

export {
	isStalePushEndpoint,
	makePushPayload,
	MAX_PUSH_ATTEMPTS,
	pushJobId,
} from "./web-push-payload";

export type PushQueue = Pick<Queue, "add">;
export async function enqueueNewMailPush(
	messageId: string,
	ownerId: string,
	queue: PushQueue,
) {
	const subscriptions = await db
		.select({ id: webPushSubscriptions.id })
		.from(webPushSubscriptions)
		.where(eq(webPushSubscriptions.userId, ownerId));
	for (const subscription of subscriptions) {
		await db
			.insert(webPushDeliveries)
			.values({ messageId, subscriptionId: subscription.id })
			.onConflictDoNothing({
				target: [webPushDeliveries.messageId, webPushDeliveries.subscriptionId],
			});
		await queue.add(
			"web-push:deliver",
			{ messageId, subscriptionId: subscription.id },
			{
				jobId: pushJobId(messageId, subscription.id),
				attempts: MAX_PUSH_ATTEMPTS,
				backoff: { type: "exponential", delay: 5000 },
				removeOnComplete: true,
				removeOnFail: false,
			},
		);
	}
}

export async function deliverWebPush(
	messageId: string,
	subscriptionId: string,
) {
	if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
	webpush.setVapidDetails(
		process.env.VAPID_SUBJECT || `mailto:noreply@localhost`,
		process.env.VAPID_PUBLIC_KEY,
		process.env.VAPID_PRIVATE_KEY,
	);
	const [row] = await db
		.select()
		.from(webPushSubscriptions)
		.where(eq(webPushSubscriptions.id, subscriptionId))
		.limit(1);
	if (!row) return;
	const [delivery] = await db
		.update(webPushDeliveries)
		.set({
			status: "sending",
			attempts: sql`${webPushDeliveries.attempts} + 1`,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(webPushDeliveries.messageId, messageId),
				eq(webPushDeliveries.subscriptionId, subscriptionId),
			),
		)
		.returning({ attempts: webPushDeliveries.attempts });
	if (!delivery) return;
	try {
		await webpush.sendNotification(
			{ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
			JSON.stringify(makePushPayload()),
		);
		await db
			.update(webPushDeliveries)
			.set({ status: "sent", updatedAt: new Date() })
			.where(
				and(
					eq(webPushDeliveries.messageId, messageId),
					eq(webPushDeliveries.subscriptionId, subscriptionId),
				),
			);
	} catch (error: unknown) {
		const statusCode =
			typeof error === "object" && error !== null && "statusCode" in error
				? Number((error as { statusCode?: number }).statusCode)
				: 0;
		if (isStalePushEndpoint(statusCode)) {
			await db
				.update(webPushDeliveries)
				.set({
					status: "stale",
					lastError: String(statusCode),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(webPushDeliveries.messageId, messageId),
						eq(webPushDeliveries.subscriptionId, subscriptionId),
					),
				);
			await db
				.delete(webPushSubscriptions)
				.where(eq(webPushSubscriptions.id, subscriptionId));
			return;
		}
		await db
			.update(webPushDeliveries)
			.set({
				status: "failed",
				lastError: error instanceof Error ? error.message : String(error),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(webPushDeliveries.messageId, messageId),
					eq(webPushDeliveries.subscriptionId, subscriptionId),
				),
			);
		throw error;
	}
}
