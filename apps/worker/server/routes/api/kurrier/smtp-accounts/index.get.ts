import { db, smtpAccounts } from "@db";
import { eq } from "drizzle-orm";
import { defineEventHandler, getQuery } from "h3";
import { apiSuccess, resolveApiActor } from "../../../../../lib/api-helpers";
import {
	getSmtpAccountSecret,
	serializeSmtpAccount,
} from "../../../../../lib/smtp-account-helpers";

export default defineEventHandler(async (event) => {
	// Admin API key: pass ?userEmail= to list another user's accounts.
	const userEmail = getQuery(event).userEmail;
	const { ownerId } = await resolveApiActor(
		event,
		userEmail ? String(userEmail) : undefined,
	);

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
