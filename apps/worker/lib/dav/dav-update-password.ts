import { davAccounts, db, updateSecretAdmin } from "@db";
import {and, eq} from "drizzle-orm";
import { randomUUID } from "crypto";
import { md5, davDb, davUsers } from "../../lib/dav/dav-schema";

export const updatePassword = async (
	userId: string,
	workspaceId: string,
) => {
	const [davAccount] = await db
		.select()
		.from(davAccounts)
		.where(
			and(
				eq(davAccounts.ownerId, userId),
				eq(davAccounts.workspaceId, workspaceId),
				eq(davAccounts.type, "user"),
			),
		)
		.limit(1);

	if (!davAccount) return null;

	const davUsername = davAccount.username;
	const newPassword = randomUUID();


	await updateSecretAdmin(davAccount.secretId, {
		value: newPassword,
	});

	const newDigest = md5(`${davUsername}:BaikalDAV:${newPassword}`);

	console.log("secret updated");

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
