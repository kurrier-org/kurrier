import {addressBooks, davAccounts, db, getSecretAdmin, labels} from "@db";
import {and, eq} from "drizzle-orm";
import { LabelScope } from "@schema";
import { createAccount } from "../../lib/dav/dav-create-account";
import {createAddressBookViaHttp} from "../../lib/dav/dav-http";
import {davAddressbooks, davDb} from "../../lib/dav/dav-schema";

const seedFavoriteLabel = async (userId: string, workspaceId: string) => {
	console.log(`Seeding favorite label for user ${userId} in workspace ${workspaceId}`, workspaceId);
	const [existing] = await db
		.select({ id: labels.id })
		.from(labels)
		.where(
			and(
				eq(labels.ownerId, userId),
				eq(labels.workspaceId, workspaceId),
				eq(labels.slug, "favorite"),
				eq(labels.scope, "contact" as LabelScope),
			),
		)
		.limit(1);

	if (existing) {
		return;
	}

	await db.insert(labels).values({
		ownerId: userId,
		workspaceId: workspaceId,
		name: "Favorite",
		slug: "favorite",
		scope: "contact" as LabelScope,
		isSystem: true,
		colorBg: "#facc15",
	});
};

export async function ensureDefaultDavAccountForWorkspace(opts: {
	workspaceId: string;
	ownerId: string;
	email: string;
}) {
	const { workspaceId, ownerId, email } = opts;

	return await createAccount(ownerId, workspaceId, email);

}

export async function ensureDefaultAddressBookForUser(opts: {
	workspaceId: string;
	ownerId: string;
}) {
	const { workspaceId, ownerId } = opts;
	const [davAccount] = await db
		.select()
		.from(davAccounts)
		.where(
			and(
				eq(davAccounts.ownerId, ownerId),
				eq(davAccounts.workspaceId, workspaceId),
				eq(davAccounts.type, "user"),
			),
		)
		.limit(1);

	if (!davAccount) {
		throw new Error("User DAV account not found");
	}

	const secret = await getSecretAdmin(String(davAccount.secretId));
	const password = secret?.vault?.decrypted_secret;

	if (!password) {
		throw new Error("User DAV password missing");
	}

	const slug = "default";
	const name = "Contacts";

	const [newBook] = await db
		.insert(addressBooks)
		.values({
			ownerId,
			workspaceId,
			davAccountId: davAccount.id,
			name,
			slug
		})
		.onConflictDoNothing()
		.returning()

	if (!newBook) throw new Error("Address book missing after insert");

	await createAddressBookViaHttp({
		davBaseUrl: `${process.env.DAV_URL}/dav.php`,
		username: davAccount.username,
		password,
		collectionPath: `addressbooks/${davAccount.username}/${slug}`,
		displayName: name,
		description: `Default address book`,
	});

	const principalUri = `principals/${davAccount.username}`;

	const [davBook] = await davDb
		.select()
		.from(davAddressbooks)
		.where(
			and(
				eq(davAddressbooks.principaluri, principalUri),
				eq(davAddressbooks.uri, slug),
			),
		)
		.limit(1);

	if (!davBook) {
		throw new Error("Failed to fetch DAV address book id");
	}

	await db
		.update(addressBooks)
		.set({
			davAddressBookId: davBook.id,
			davSyncToken: String(davBook.synctoken),
		})
		.where(eq(addressBooks.id, newBook.id))

	return { ok: true };

}


export async function runMigrationsForWorkspace(
	userId: string,
	workspaceId: string,
	email: string
) {
	await seedFavoriteLabel(userId, workspaceId);
	await ensureDefaultDavAccountForWorkspace({ ownerId: userId, workspaceId, email });
	await ensureDefaultAddressBookForUser({ownerId: userId, workspaceId});
}
