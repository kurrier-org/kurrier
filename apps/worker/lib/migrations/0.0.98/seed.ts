import { davAccounts, db } from "@db";
import { eq } from "drizzle-orm";
import {
	davDb,
	davUsers,
	davPrincipals,
	md5,
} from "../../../lib/dav/dav-schema";
import {
	DavUserContext,
	buildContextFromExistingAccount,
	ensureDefaultAddressBook,
	ensureDefaultCalendar,
} from "../../../lib/dav/dav-create-account";

export async function migrateLegacyKurrierAccount(
	baseCtx: DavUserContext,
): Promise<DavUserContext> {
	const { userId, davPassword, davAccount } = baseCtx;

	if (davAccount.username !== "kurrier") {
		return baseCtx;
	}

	const newUsername = `kurrier-${userId}`;
	const newPrincipalUri = `principals/${newUsername}`;
	const digest = await md5(`${newUsername}:BaikalDAV:${davPassword}`);

	const [existingNewUser] = await davDb
		.select()
		.from(davUsers)
		.where(eq(davUsers.username, newUsername))
		.limit(1);

	if (!existingNewUser) {
		await davDb.insert(davUsers).values({
			username: newUsername,
			digesta1: digest,
		});
	} else if (existingNewUser.digesta1 !== digest) {
		await davDb
			.update(davUsers)
			.set({ digesta1: digest })
			.where(eq(davUsers.username, newUsername));
	}
	const [existingPrincipal] = await davDb
		.select()
		.from(davPrincipals)
		.where(eq(davPrincipals.uri, newPrincipalUri))
		.limit(1);

	if (!existingPrincipal) {
		await davDb.insert(davPrincipals).values({
			uri: newPrincipalUri,
			email: null,
			displayname: "Kurrier",
		});
	}
	const [updatedAccount] = await db
		.update(davAccounts)
		.set({ username: newUsername })
		.where(eq(davAccounts.id, davAccount.id))
		.returning();

	console.info(
		`[dav-migration] user ${userId}: migrated DAV username "kurrier" -> "${newUsername}"`,
	);

	return {
		userId,
		davUsername: newUsername,
		davPassword,
		principalUri: newPrincipalUri,
		davAccount: updatedAccount,
	};
}

export default async function seed({ userId }: { userId: string }) {
	const [davAccount] = await db
		.select()
		.from(davAccounts)
		.where(eq(davAccounts.ownerId, userId))
		.limit(1);

	if (!davAccount) {
		console.info(`[0.0.98] user ${userId}: no davAccount, skipping`);
		return;
	}

	const baseCtx = await buildContextFromExistingAccount(userId);
	if (!baseCtx) {
		console.warn(
			`[0.0.98] user ${userId}: could not build DAV context, skipping`,
		);
		return;
	}

	let ctx = baseCtx;
	if (davAccount.username === "kurrier") {
		ctx = await migrateLegacyKurrierAccount(baseCtx);
	}

	await ensureDefaultAddressBook(ctx);
	await ensureDefaultCalendar(ctx);

	console.info(
		`[0.0.98] user ${userId}: ensured default DAV addressbook + calendar for ${ctx.davUsername}`,
	);
	console.info("Migration 0.0.98 - seed.ts executed");
}
