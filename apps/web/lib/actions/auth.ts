"use server";

import { APP_VERSION } from "@common";
import { db, identities, users, workspaces, workspaceMembers } from "@db";
import { FormState, getPublicEnv, getServerEnv } from "@schema";
import argon2 from "argon2";
import { Queue, QueueEvents } from "bullmq";
import { decode } from "decode-formdata";
import { eq } from "drizzle-orm";
import { jwtVerify, JWTPayload, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as crypto from "node:crypto";
import { getRedis } from "@/lib/actions/get-redis";
import { updateWorkSpaceContext } from "@/lib/actions/workspace";
import {withLocale} from "@/lib/utils";


const initProviders = async (userId: string, workspaceId: string) => {
	const { REDIS_PASSWORD, REDIS_HOST, REDIS_PORT } = getServerEnv();

	const redisConnection = {
		connection: {
			host: REDIS_HOST || "redis",
			port: Number(REDIS_PORT || 6379),
			password: REDIS_PASSWORD,
		},
	};

	const commonWorkerQueue = new Queue("common-worker", redisConnection);
	const commonWorkerEvents = new QueueEvents("common-worker", redisConnection);

	await commonWorkerEvents.waitUntilReady();
	await commonWorkerQueue.add("sync-providers", { userId, workspaceId });
};

const createUserWorkspace = async (userId: string, name?: string) => {
	const [workspace] = await db
		.insert(workspaces)
		.values({
			name: name ?? "Default Workspace",
			ownerId: userId,
			storageBytesUsed: 0,
		})
		.returning();

	return workspace;
};

const applyPendingMigrations = async (
	userId: string,
	workspaceId: string,
	email: string,
) => {
	const { migrationWorkerQueue } = await getRedis();

	await migrationWorkerQueue.add(
		"migration:run-for-user-after-signup",
		{ userId, workspaceId, email },
		{
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 3000,
			},
			removeOnComplete: { age: 60 },
			removeOnFail: false,
			jobId: `migration:${userId}:${APP_VERSION}`,
		},
	);
};

async function signToken(userId: string) {
	const { JWT_SECRET } = getServerEnv();

	return new SignJWT({})
		.setProtectedHeader({ alg: "HS256" })
		.setSubject(userId)
		.setIssuedAt()
		.setExpirationTime("30d")
		.sign(new TextEncoder().encode(JWT_SECRET));
}

async function setAuthToken(token: string) {
	const cookieStore = await cookies();

	cookieStore.set("session", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		maxAge: 60 * 60 * 24 * 30,
	});
}

export async function createUserWithWorkspace(opts: {
	email: string;
	passwordHash: string;
	workspaceName?: string;
}) {
	const [existing] = await db
		.select()
		.from(users)
		.where(eq(users.email, opts.email));

	if (existing) {
		return { error: "An account with this email already exists" };
	}

	const [user] = await db
		.insert(users)
		.values({
			email: opts.email,
			passwordHash: opts.passwordHash,
		})
		.returning();

	const workspace = await createUserWorkspace(user.id, opts.workspaceName);

	await db
		.insert(workspaceMembers)
		.values({
			workspaceId: workspace.id,
			userId: user.id,
			role: "owner",
		})
		.onConflictDoNothing();

	await initProviders(user.id, workspace.id);
	await applyPendingMigrations(user.id, workspace.id, opts.email);

	return user;
}

export async function signInUserAndRedirect(user: typeof users.$inferSelect,  locale?: string) {
	await createSessionForUser(user.id);
	redirect(await getWorkspaceRedirectUrl(user));
}

export async function login(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const { email, password, locale } = decode(formData) as {
		email: string;
		password: string;
		locale?: string;
	};

	if (!email || !password) {
		return { error: "Missing email or password" };
	}

	const [user] = await db.select().from(users).where(eq(users.email, email));

	if (!user || !user.passwordHash) {
		return { error: "Invalid credentials" };
	}

	const valid = await argon2.verify(user.passwordHash, password);

	if (!valid) {
		return { error: "Invalid credentials" };
	}

	await signInUserAndRedirect(user, locale);

	return { success: true, message: "Logged in!" };
}

export async function signup(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	const { DISABLE_SIGNUP } = getPublicEnv();

	if (DISABLE_SIGNUP) {
		return {
			success: false,
			error: "Signup is currently disabled. Please contact your administrator.",
		};
	}

	const { workspaceName, email, password } = decode(formData) as {
		email: string;
		password: string;
		workspaceName: string;
	};

	if (!email || !password) {
		return { error: "Missing email or password" };
	}

	const passwordHash = await argon2.hash(password);

	const user = await createUserWithWorkspace({
		email,
		passwordHash,
		workspaceName,
	});

	if ("error" in user) {
		return { error: user.error };
	}

	await signInUserAndRedirect(user);

	return { success: true, message: "Welcome!" };
}

export type TokenClaims = JWTPayload & {
	sub: string;
	workspace_id?: string;
};

export async function verifyAndDecode(
	token?: string,
): Promise<TokenClaims | null> {
	if (!token) return null;

	try {
		const { JWT_SECRET } = getServerEnv();
		const { payload } = await jwtVerify<TokenClaims>(
			token,
			new TextEncoder().encode(JWT_SECRET),
		);

		if (!payload.sub) {
			return null;
		}

		return payload;
	} catch {
		return null;
	}
}

export async function isSignedIn() {
	const cookieStore = await cookies();
	const token = cookieStore.get("session")?.value;

	if (!token) {
		return null;
	}

	const claims = await verifyAndDecode(token);

	if (!claims?.sub) {
		return null;
	}

	const [user] = await db
		.select({ id: users.id, email: users.email })
		.from(users)
		.where(eq(users.id, claims.sub));

	if (!user) {
		return null;
	}

	return user;
}

export type FetchIsSignedInResult = Awaited<ReturnType<typeof isSignedIn>>;

export const currentSession = async () => {
	const cookieStore = await cookies();
	return String(cookieStore.get("session")?.value);
};

export const signOut = async (redirectUrl?: string) => {
	const cookieStore = await cookies();
	cookieStore.delete("session");
	redirect(redirectUrl ? redirectUrl : "/auth/login");
};

export const getGravatarUrl = async (email: string, size = 80) => {
	const trimmedEmail = email.trim().toLowerCase();
	const hash = crypto.createHash("sha256").update(trimmedEmail).digest("hex");
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
};


export async function createSessionForUser(userId: string) {
	const token = await signToken(userId);
	await setAuthToken(token);
}

export async function getWorkspaceRedirectUrl(user: typeof users.$inferSelect, locale?: string) {
	const [workspace] = await db
		.select()
		.from(workspaces)
		.where(eq(workspaces.ownerId, user.id));

	if (!workspace) {
		return "/auth/login";
	}

	await updateWorkSpaceContext(workspace.publicId, workspace.id, user);

	if (workspace.defaultIdentityId) {
		const [defaultIdentity] = await db
			.select()
			.from(identities)
			.where(eq(identities.id, workspace.defaultIdentityId));

		if (defaultIdentity) {
			if (locale) {
				redirect(withLocale(locale,`/w/${workspace.publicId}/dashboard/platform/overview`));
			}
			return `/w/${workspace.publicId}/dashboard/mail/${defaultIdentity.publicId}/inbox`;
		}
	}

	return `/w/${workspace.publicId}/dashboard/platform/overview`;
}
