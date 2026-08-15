import {
	db,
	identities,
	workspaceIdentityMembers,
	workspaceMembers,
	workspaces,
} from "@db";
import { defaultImapQuota, IdentityCreateApiSchema } from "@schema";
import { and, eq, inArray } from "drizzle-orm";
import { defineEventHandler } from "h3";
import {
	apiError,
	apiSuccess,
	resolveApiActor,
	validateJSONBody,
} from "../../../../../lib/api-helpers";
import { getRedis } from "../../../../../lib/get-redis";
import {
	getSmtpAccountSecret,
	validateSmtpAccountOwnership,
} from "../../../../../lib/smtp-account-helpers";

const BACKFILL_DISCOVER_TIMEOUT_MS = 60_000;

async function grantIdentityMembers(
	identity: { id: string; workspaceId: string },
	userIds: string[],
) {
	if (!userIds.length) return;

	await db
		.insert(workspaceIdentityMembers)
		.values(
			userIds.map((userId) => ({
				identityId: identity.id,
				workspaceId: identity.workspaceId,
				userId,
			})),
		)
		.onConflictDoNothing();
}

// Mirrors checkDefaultWorkspaceIdentity from the dashboard actions: when the
// owner has exactly one workspace-shared identity, it becomes the default.
async function checkDefaultIdentity(ownerId: string, workspaceId: string) {
	const shared = await db
		.select({ id: identities.id })
		.from(identities)
		.where(
			and(
				eq(identities.sharedWithWorkspace, true),
				eq(identities.ownerId, ownerId),
				eq(identities.workspaceId, workspaceId),
			),
		);

	if (shared.length === 1) {
		await db
			.update(workspaces)
			.set({ defaultIdentityId: shared[0].id })
			.where(eq(workspaces.id, workspaceId));
	}
}

// Same queue choreography as the dashboard flow (backfillMailboxes /
// backfillAccount): discover mailboxes first, then backfill and start IDLE.
async function startImapBackfill(identityId: string, workspaceId: string) {
	const { smtpQueue, smtpEvents } = await getRedis();

	const discoverJob = await smtpQueue.add(
		"imap:backfill-discover",
		{ identityId, workspaceId },
		{
			jobId: `imap-backfill-discover-${identityId}`,
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 1000,
			},
		},
	);
	await discoverJob.waitUntilFinished(smtpEvents, BACKFILL_DISCOVER_TIMEOUT_MS);

	await smtpQueue.add(
		"imap:backfill-account",
		{ identityId },
		{
			removeOnComplete: true,
			removeOnFail: true,
			jobId: `imap-backfill-account-${identityId}`,
		},
	);
	await smtpQueue.add(
		"imap:start-idle",
		{ identityId },
		{
			removeOnComplete: true,
			removeOnFail: false,
			attempts: 3,
			backoff: { type: "exponential", delay: 1500 },
		},
	);
}

export default defineEventHandler(async (event) => {
	const { json } = await validateJSONBody(event);

	const parsed = IdentityCreateApiSchema.safeParse(json);
	if (!parsed.success) {
		const issues = parsed.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		}));
		return apiError(
			400,
			"INVALID_REQUEST_BODY",
			"Invalid request body",
			issues,
		);
	}

	const data = parsed.data;
	const { ownerId, workspaceId } = await resolveApiActor(event, data.userEmail);

	const account = await validateSmtpAccountOwnership({
		accountId: data.smtpAccountId,
		ownerId,
	});

	const [duplicate] = await db
		.select({ id: identities.id })
		.from(identities)
		.where(
			and(
				eq(identities.workspaceId, workspaceId),
				eq(identities.kind, "email"),
				eq(identities.value, data.value),
			),
		);

	if (duplicate) {
		return apiError(
			409,
			"IDENTITY_EXISTS",
			`An email identity for ${data.value} already exists in this workspace`,
		);
	}

	let memberIds: string[];
	if (data.sharedWithWorkspace) {
		const members = await db
			.select({ userId: workspaceMembers.userId })
			.from(workspaceMembers)
			.where(eq(workspaceMembers.workspaceId, workspaceId));
		memberIds = members.map((m) => m.userId);
	} else if (data.memberIds?.length) {
		const members = await db
			.select({ userId: workspaceMembers.userId })
			.from(workspaceMembers)
			.where(
				and(
					eq(workspaceMembers.workspaceId, workspaceId),
					inArray(workspaceMembers.userId, data.memberIds),
				),
			);
		memberIds = members.map((m) => m.userId);

		if (memberIds.length !== data.memberIds.length) {
			return apiError(
				400,
				"INVALID_MEMBER_IDS",
				"One or more memberIds are not members of this workspace",
			);
		}
	} else {
		memberIds = [ownerId];
	}

	const [identity] = await db
		.insert(identities)
		.values({
			ownerId,
			workspaceId,
			kind: "email",
			value: data.value,
			displayName: data.displayName ?? null,
			smtpAccountId: account.id,
			sharedWithWorkspace: data.sharedWithWorkspace,
			metaData: {
				dailyQuota: data.dailyQuota ?? defaultImapQuota,
				sharedWithWorkspace: data.sharedWithWorkspace,
			},
		})
		.returning();

	await grantIdentityMembers(identity, memberIds);
	await checkDefaultIdentity(ownerId, workspaceId);

	// Mailbox sync only makes sense when the account has IMAP settings;
	// send-only SMTP accounts skip the backfill entirely.
	const secret = await getSmtpAccountSecret({ accountId: account.id, ownerId });
	let backfill: "completed" | "skipped" | "failed" = "skipped";

	if (secret?.config?.IMAP_HOST) {
		try {
			await startImapBackfill(identity.id, workspaceId);
			backfill = "completed";
		} catch (err) {
			console.error(
				`[API] IMAP backfill failed for identity ${identity.id}:`,
				err,
			);
			backfill = "failed";
		}
	}

	return apiSuccess({ identity, backfill });
});
