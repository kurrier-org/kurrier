import crypto from "node:crypto";
import {
	apiKeys,
	db,
	getSecretAdmin,
	identities,
	secretsMeta,
	users,
	workspaces,
} from "@db";
import { and, eq } from "drizzle-orm";
import { createError, type H3Event, readRawBody } from "h3";

export function apiSuccess(data: any = null) {
	return {
		success: true,
		data,
	};
}

export function apiError(
	statusCode: number,
	code: string,
	message: string,
	issues?: any,
) {
	throw createError({
		statusCode,
		statusMessage: message,
		data: {
			success: false,
			error: {
				code,
				message,
				issues,
			},
		},
	});
}

export async function validateJSONBody(event: H3Event) {
	const raw = (await readRawBody(event)) || "";
	let json: any;
	try {
		json = JSON.parse(raw);
	} catch (e) {
		throw createError({
			statusCode: 400,
			statusMessage: "Invalid JSON in request body",
		});
	}

	return { raw, json };
}

function safeEqual(a: string, b: string) {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);

	if (ab.length !== bb.length) return false;

	return crypto.timingSafeEqual(ab, bb);
}

export async function validateApiKey(event: H3Event) {
	const auth = event.node.req.headers.authorization;

	if (!auth || !auth.startsWith("Bearer ")) {
		throw createError({
			statusCode: 401,
			statusMessage: "Missing or invalid Authorization header",
		});
	}

	const token = auth.replace("Bearer ", "").trim();

	const parts = token.split(".");
	if (parts.length < 2) {
		throw createError({
			statusCode: 401,
			statusMessage: "Invalid API key format",
		});
	}

	const prefix = parts[0];
	const rest = parts.slice(1).join(".");
	const last4 = rest.slice(-4);

	if (!prefix || last4.length !== 4) {
		throw createError({
			statusCode: 401,
			statusMessage: "Invalid API key format",
		});
	}

	const [key] = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.keyLast4, last4)))
		.limit(1);

	if (!key) {
		throw createError({
			statusCode: 401,
			statusMessage: "Invalid API key",
		});
	}

	if (key.revokedAt) {
		throw createError({
			statusCode: 401,
			statusMessage: "API key has been revoked",
		});
	}

	const [secretMeta] = await db
		.select()
		.from(secretsMeta)
		.where(eq(secretsMeta.id, key.secretId))
		.limit(1);

	if (!secretMeta) {
		throw createError({
			statusCode: 401,
			statusMessage: "API key secret not found",
		});
	}

	const actualSecret = await getSecretAdmin(secretMeta.id);
	if (!actualSecret?.vault || !safeEqual(String(actualSecret.vault), token)) {
		throw createError({
			statusCode: 401,
			statusMessage: "Invalid API key",
		});
	}

	return {
		apiKey: key,
		secret: actualSecret.vault,
		ownerId: key.ownerId,
	};
}

/**
 * Instance-level admin authentication for the management API.
 *
 * When the API_ADMIN_KEY environment variable is set (32+ chars), requests
 * bearing it may act on behalf of any user — e.g. to provision accounts
 * before their first login. Opt-in: without the env var this always
 * returns false and only regular per-user API keys work.
 */
export function isAdminApiRequest(event: H3Event): boolean {
	const adminKey = process.env.API_ADMIN_KEY;
	if (!adminKey || adminKey.length < 32) return false;

	const auth = event.node.req.headers.authorization;
	if (!auth || !auth.startsWith("Bearer ")) return false;

	const token = auth.replace("Bearer ", "").trim();
	return safeEqual(token, adminKey);
}

export function requireAdminApiKey(event: H3Event) {
	if (!isAdminApiRequest(event)) {
		throw createError({
			statusCode: 401,
			statusMessage: "This endpoint requires the admin API key",
		});
	}
}

export type ApiActor = {
	ownerId: string;
	workspaceId: string;
	isAdmin: boolean;
};

/**
 * Resolves who a management API request acts as.
 *
 * - Regular API key: the key's owner and workspace (userEmail is rejected).
 * - Admin API key: the user designated by userEmail and the workspace they
 *   own, so one infrastructure-held key can manage every account.
 */
export async function resolveApiActor(
	event: H3Event,
	userEmail?: string | null,
): Promise<ApiActor> {
	if (isAdminApiRequest(event)) {
		if (!userEmail) {
			throw createError({
				statusCode: 400,
				statusMessage:
					"userEmail is required when authenticating with the admin API key",
			});
		}

		const [user] = await db
			.select()
			.from(users)
			.where(eq(users.email, userEmail))
			.limit(1);

		if (!user) {
			throw createError({
				statusCode: 404,
				statusMessage: "User not found",
			});
		}

		const [workspace] = await db
			.select()
			.from(workspaces)
			.where(eq(workspaces.ownerId, user.id))
			.limit(1);

		if (!workspace) {
			throw createError({
				statusCode: 404,
				statusMessage: "User has no workspace",
			});
		}

		return { ownerId: user.id, workspaceId: workspace.id, isAdmin: true };
	}

	if (userEmail) {
		throw createError({
			statusCode: 403,
			statusMessage: "userEmail requires the admin API key",
		});
	}

	const { apiKey, ownerId } = await validateApiKey(event);
	return { ownerId, workspaceId: apiKey.workspaceId, isAdmin: false };
}

export async function validateIdentityOwnership(opts: {
	identityId: string;
	ownerId: string;
}) {
	const [identity] = await db
		.select()
		.from(identities)
		.where(
			and(
				eq(identities.id, opts.identityId),
				eq(identities.ownerId, opts.ownerId),
			),
		)
		.limit(1);

	if (!identity) {
		throw createError({
			statusCode: 403,
			statusMessage: "Identity not found or access denied",
		});
	}
	return identity;
}
