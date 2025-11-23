import { addressBooks, createSecretAdmin, davAccounts, db } from "@db";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import {
	md5,
	davDb,
	davUsers,
	davAddressbooks,
} from "../../lib/dav/dav-schema";

export const seedAccount = async (userId: string) => {
	const [existingDavAccount] = await db
		.select()
		.from(davAccounts)
		.where(eq(davAccounts.ownerId, userId));

	if (existingDavAccount) return existingDavAccount;

	const davUsername = "kurrier";
	const davPassword = randomUUID();
	const secretName = `dav-${randomUUID()}`;
	const secretIdRow = await createSecretAdmin({
		ownerId: userId,
		name: secretName,
		value: davPassword,
		description: "Auto-generated DAV password",
	});

	const [newDavAccount] = await db
		.insert(davAccounts)
		.values({
			ownerId: userId,
			secretId: secretIdRow.id,
			username: davUsername,
		})
		.returning();

	const davPasswordHash = await md5(`${davUsername}:BaikalDAV:${davPassword}`);
	await davDb
		.update(davUsers)
		.set({
			digesta1: davPasswordHash,
		})
		.where(eq(davUsers.username, davUsername));

	const remotePath = `addressbooks/${davUsername}/default`;

	await db
		.insert(addressBooks)
		.values({
			ownerId: userId,
			davAccountId: newDavAccount.id,
			name: "Default Address Book for Kurrier",
			slug: "default",
			remotePath,
			isDefault: true,
		})
		.returning();

	await davDb
		.update(davAddressbooks)
		.set({
			displayname: "Kurrier Contacts",
			description: "Default Address Book for Kurrier",
		})
		.where(
			and(
				eq(davAddressbooks.principaluri, `principals/${davUsername}`),
				eq(davAddressbooks.uri, "default"),
			),
		);

	return newDavAccount;
};
