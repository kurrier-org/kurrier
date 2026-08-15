import { db, smtpAccounts } from "@db";
import { eq } from "drizzle-orm";
import { defineEventHandler } from "h3";
import { apiSuccess, validateApiKey } from "../../../../../lib/api-helpers";
import {
	getSmtpAccountSecret,
	serializeSmtpAccount,
} from "../../../../../lib/smtp-account-helpers";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);

	const accounts = await db
		.select()
		.from(smtpAccounts)
		.where(eq(smtpAccounts.ownerId, ownerId));

	const result = await Promise.all(
		accounts.map(async (account) => {
			const secret = await getSmtpAccountSecret({
				accountId: account.id,
				ownerId,
			});
			return serializeSmtpAccount(account, secret?.config ?? null);
		}),
	);

	return apiSuccess(result);
});
