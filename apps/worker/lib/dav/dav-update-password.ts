import { davAccounts, db, updateSecretAdmin } from "@db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { md5, davDb, davUsers } from "../../lib/dav/dav-schema";

export const updatePassword = async (userId: string) => {
	const [davAccount] = await db
		.select()
		.from(davAccounts)
		.where(eq(davAccounts.ownerId, userId));

	if (!davAccount) return;

	const davUsername = davAccount.username;
	const newPassword = randomUUID();

	const secretId = davAccount.secretId;
	await updateSecretAdmin(secretId, {
		value: newPassword,
	});
	const newDigest = md5(`${davUsername}:BaikalDAV:${newPassword}`);
	await davDb
		.update(davUsers)
		.set({ digesta1: newDigest })
		.where(eq(davUsers.username, davUsername));

	return {
		success: true,
		username: davUsername,
		newPassword,
	};
};
