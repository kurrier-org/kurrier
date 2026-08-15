import crypto from "node:crypto";
import { APP_VERSION } from "@common";
import { db, users, workspaceMembers, workspaces } from "@db";
import { UserCreateApiSchema } from "@schema";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import {
	apiError,
	apiSuccess,
	requireAdminApiKey,
	validateJSONBody,
} from "../../../../../lib/api-helpers";
import { getRedis } from "../../../../../lib/get-redis";

// Pre-provisions a user before their first login (admin API key only):
// same steps as signup/OIDC — user + default workspace + owner membership,
// then the provider-sync and pending-migration jobs. The password hash is
// a random UUID nobody knows, so the account is only reachable through
// SSO/OIDC login, which attaches to the existing user by email.
export default defineEventHandler(async (event) => {
	requireAdminApiKey(event);

	const { json } = await validateJSONBody(event);
	const parsed = UserCreateApiSchema.safeParse(json);
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

	const { email, workspaceName } = parsed.data;

	const [existing] = await db
		.select()
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existing) {
		const [workspace] = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.ownerId, existing.id))
			.limit(1);

		return apiSuccess({
			user: { id: existing.id, email: existing.email },
			workspace: workspace
				? { id: workspace.id, publicId: workspace.publicId }
				: null,
			created: false,
		});
	}

	const passwordHash = await argon2.hash(crypto.randomUUID());

	const [user] = await db
		.insert(users)
		.values({ email, passwordHash })
		.returning();

	const [workspace] = await db
		.insert(workspaces)
		.values({
			name: workspaceName ?? "Default Workspace",
			ownerId: user.id,
			storageBytesUsed: 0,
		})
		.returning();

	await db
		.insert(workspaceMembers)
		.values({
			workspaceId: workspace.id,
			userId: user.id,
			role: "owner",
		})
		.onConflictDoNothing();

	const { commonWorkerQueue, migrationWorkerQueue } = await getRedis();

	await commonWorkerQueue.add("sync-providers", {
		userId: user.id,
		workspaceId: workspace.id,
	});

	await migrationWorkerQueue.add(
		"migration:run-for-user-after-signup",
		{ userId: user.id, workspaceId: workspace.id, email },
		{
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 3000,
			},
			removeOnComplete: { age: 60 },
			removeOnFail: false,
			jobId: `migration:${user.id}:${APP_VERSION}`,
		},
	);

	return apiSuccess({
		user: { id: user.id, email: user.email },
		workspace: { id: workspace.id, publicId: workspace.publicId },
		created: true,
	});
});
