import { randomUUID } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import https from "node:https";
import { isUnsafeWebPushAddress, validateWebPushSubscription } from "@common";
import { db, messages, webPushDeliveries, webPushSubscriptions } from "@db";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import webpush from "web-push";
import {
	isStalePushEndpoint,
	MAX_PUSH_ATTEMPTS,
	makePushPayload,
	pushJobId,
} from "./web-push-payload";
import {
	type PushQueue,
	reconcileWebPushDeliveryJob,
} from "./web-push-reconcile";

export { isStalePushEndpoint, MAX_PUSH_ATTEMPTS, makePushPayload, pushJobId };

export { reconcileWebPushDeliveryJob };
export type { PushQueue };

function createPinnedPushAgent() {
	return new https.Agent({
		lookup(hostname, _options, callback) {
			void dnsLookup(hostname, { all: true }).then((addresses) => {
				const safe = addresses.find(
					({ address }) => !isUnsafeWebPushAddress(address),
				);
				if (
					!safe ||
					addresses.some(({ address }) => isUnsafeWebPushAddress(address))
				) {
					callback(
						new Error(
							"Web Push endpoint resolves to a private or reserved address",
						),
					);
					return;
				}
				callback(null, safe.address, safe.family);
			}, callback);
		},
	});
}
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

export async function reconcileQueuedWebPushDeliveries(queue: PushQueue) {
	const deliveries = await db
		.select({
			messageId: webPushDeliveries.messageId,
			subscriptionId: webPushDeliveries.subscriptionId,
		})
		.from(webPushDeliveries)
		.innerJoin(messages, eq(messages.id, webPushDeliveries.messageId))
		.innerJoin(
			webPushSubscriptions,
			eq(webPushSubscriptions.id, webPushDeliveries.subscriptionId),
		)
		.where(
			and(
				inArray(webPushDeliveries.status, ["queued", "failed"]),
				lt(webPushDeliveries.attempts, MAX_PUSH_ATTEMPTS),
			),
		);
	for (const delivery of deliveries) {
		if (!delivery.messageId || !delivery.subscriptionId) continue;
		await reconcileWebPushDeliveryJob(queue, delivery);
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
		.select({
			id: webPushSubscriptions.id,
			endpoint: webPushSubscriptions.endpoint,
			p256dh: webPushSubscriptions.p256dh,
			auth: webPushSubscriptions.auth,
		})
		.from(webPushSubscriptions)
		.innerJoin(messages, eq(messages.ownerId, webPushSubscriptions.userId))
		.where(
			and(
				eq(webPushSubscriptions.id, subscriptionId),
				eq(messages.id, messageId),
			),
		)
		.limit(1);
	if (!row) return;
	const [delivery] = await db
		.update(webPushDeliveries)
		.set({
			status: "sending",
			attempts: sql`${webPushDeliveries.attempts} + 1`,
			updatedAt: new Date(),
			leaseUntil: new Date(Date.now() + 5 * 60_000),
			leaseToken: randomUUID(),
		})
		.where(
			and(
				eq(webPushDeliveries.messageId, messageId),
				eq(webPushDeliveries.subscriptionId, subscriptionId),
				lt(webPushDeliveries.attempts, MAX_PUSH_ATTEMPTS),
				or(
					inArray(webPushDeliveries.status, ["queued", "failed"]),
					and(
						eq(webPushDeliveries.status, "sending"),
						or(
							isNull(webPushDeliveries.leaseUntil),
							lt(webPushDeliveries.leaseUntil, new Date()),
						),
					),
				),
			),
		)
		.returning({
			attempts: webPushDeliveries.attempts,
			leaseToken: webPushDeliveries.leaseToken,
		});
	if (!delivery?.leaseToken) return;
	const leaseToken = delivery.leaseToken;
	try {
		await validateWebPushSubscription({
			endpoint: row.endpoint,
			keys: { p256dh: row.p256dh, auth: row.auth },
		});
		await webpush.sendNotification(
			{ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
			JSON.stringify(makePushPayload()),
			{ agent: createPinnedPushAgent() },
		);
		await db
			.update(webPushDeliveries)
			.set({ status: "sent", updatedAt: new Date() })
			.where(
				and(
					eq(webPushDeliveries.messageId, messageId),
					eq(webPushDeliveries.subscriptionId, subscriptionId),
					eq(webPushDeliveries.status, "sending"),
					eq(webPushDeliveries.leaseToken, leaseToken),
				),
			);
	} catch (error: unknown) {
		const statusCode =
			typeof error === "object" && error !== null && "statusCode" in error
				? Number((error as { statusCode?: number }).statusCode)
				: 0;
		if (isStalePushEndpoint(statusCode)) {
			const staleDelivery = await db
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
						eq(webPushDeliveries.leaseToken, leaseToken),
					),
				)
				.returning({ id: webPushDeliveries.id });
			if (!staleDelivery.length) return;
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
					eq(webPushDeliveries.status, "sending"),
					eq(webPushDeliveries.leaseToken, leaseToken),
				),
			);
		throw error;
	}
}
