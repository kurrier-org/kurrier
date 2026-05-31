import {
	createSecretAdmin,
	davAccounts,
	db,
	getSecretAdmin,
	secretsMeta,
} from "@db";
import {and, eq} from "drizzle-orm";
import { randomUUID } from "crypto";
import {
	md5,
	davDb,
	davUsers,
	davPrincipals,
} from "../../lib/dav/dav-schema";

export type DavUserContext = {
	userId: string;
	davUsername: string;
	davPassword: string;
	principalUri: string;
	davAccount: typeof davAccounts.$inferSelect;
};


async function createDavWorkspaceUser(
	workspaceId: string,
	systemOwnerId: string,
	email: string,
): Promise<DavUserContext> {
	const davUsername = `kurrier-ws-${workspaceId}`;
	const davPassword = randomUUID();
	const principalUri = `principals/${davUsername}`;

	const [existingDavAccount] = await db
		.select()
		.from(davAccounts)
		.where(and(
			eq(davAccounts.type, "workspace"),
			eq(davAccounts.workspaceId, workspaceId)
		)).limit(1);

	if (existingDavAccount) {
		const [secretRow] = await db
			.select({ metaId: secretsMeta.id })
			.from(secretsMeta)
			.where(eq(secretsMeta.id, existingDavAccount.secretId))

		const secret = await getSecretAdmin(String(secretRow?.metaId));
		const existingPassword = secret?.vault?.decrypted_secret;

		return {
			userId: systemOwnerId,
			davUsername: existingDavAccount.username,
			davPassword: existingPassword,
			principalUri: `principals/${existingDavAccount.username}`,
			davAccount: existingDavAccount,
		};
	}

	const secretName = `dav-ws-${randomUUID()}`;

	const secretIdRow = await createSecretAdmin({
		ownerId: systemOwnerId,
		name: secretName,
		value: davPassword,
		workspaceId,
		description: "Auto-generated Workspace DAV password",
	});

	const [davAccount] = await db
		.insert(davAccounts)
		.values({
			type: "workspace",
			ownerId: systemOwnerId,
			workspaceId,
			secretId: secretIdRow.id,
			username: davUsername,
		})
		.returning();

	const davPasswordHash = await md5(`${davUsername}:BaikalDAV:${davPassword}`);

	const [existingUser] = await davDb
		.select()
		.from(davUsers)
		.where(eq(davUsers.username, davUsername))
		.limit(1);

	if (!existingUser) {
		await davDb.insert(davUsers).values({
			username: davUsername,
			digesta1: davPasswordHash,
		});
	} else if (existingUser.digesta1 !== davPasswordHash) {
		await davDb
			.update(davUsers)
			.set({ digesta1: davPasswordHash })
			.where(eq(davUsers.username, davUsername));
	}

	const [existingPrincipal] = await davDb
		.select()
		.from(davPrincipals)
		.where(eq(davPrincipals.uri, principalUri))
		.limit(1);

	if (!existingPrincipal) {
		await davDb.insert(davPrincipals).values({
			uri: principalUri,
			email,
			displayname: "Kurrier Workspace",
		});
	}

	return {
		userId: systemOwnerId,
		davUsername,
		davPassword,
		principalUri,
		davAccount,
	};
}

async function createDavUser(userId: string, workspaceId: string, email: string): Promise<DavUserContext> {
	const davUsername = `kurrier-${workspaceId}-${userId}`;
	const davPassword = randomUUID();
	const principalUri = `principals/${davUsername}`;

	const secretName = `dav-${randomUUID()}`;
	const secretIdRow = await createSecretAdmin({
		ownerId: userId,
		name: secretName,
		value: davPassword,
		workspaceId,
		description: "Auto-generated DAV password",
	});

	const [davAccount] = await db
		.insert(davAccounts)
		.values({
			ownerId: userId,
			secretId: secretIdRow.id,
			username: davUsername,
			workspaceId
		})
		.returning();

	const davPasswordHash = await md5(`${davUsername}:BaikalDAV:${davPassword}`);

	const [existingUser] = await davDb
		.select()
		.from(davUsers)
		.where(eq(davUsers.username, davUsername))
		.limit(1);

	if (!existingUser) {
		await davDb.insert(davUsers).values({
			username: davUsername,
			digesta1: davPasswordHash,
		});
	} else if (existingUser.digesta1 !== davPasswordHash) {
		await davDb
			.update(davUsers)
			.set({ digesta1: davPasswordHash })
			.where(eq(davUsers.username, davUsername));
	}

	const [existingPrincipal] = await davDb
		.select()
		.from(davPrincipals)
		.where(eq(davPrincipals.uri, principalUri))
		.limit(1);

	if (!existingPrincipal) {
		await davDb.insert(davPrincipals).values({
			uri: principalUri,
			email,
			displayname: "Kurrier",
		});
	}

	return { userId, davUsername, davPassword, principalUri, davAccount };
}




export const createAccount = async (userId: string, workspaceId: string, email: string) => {
	await createDavWorkspaceUser(workspaceId, userId, email);
	const [existingDavAccount] = await db
		.select()
		.from(davAccounts)
		.where(and(
			eq(davAccounts.ownerId, userId),
			eq(davAccounts.workspaceId, workspaceId),
			eq(davAccounts.type, "user")
		))
		.limit(1);

	if (existingDavAccount) return existingDavAccount;
	const ctx = await createDavUser(userId, workspaceId, email);

	return ctx.davAccount;
};
