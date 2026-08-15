import {
	db,
	deleteSecretAdmin,
	identities,
	smtpAccountSecrets,
	smtpAccounts,
} from "@db";
import { eq } from "drizzle-orm";
import { defineEventHandler, getRouterParam } from "h3";
import {
	apiError,
	apiSuccess,
	isAdminApiRequest,
	validateApiKey,
} from "../../../../../lib/api-helpers";
import { validateSmtpAccountOwnership } from "../../../../../lib/smtp-account-helpers";

export default defineEventHandler(async (event) => {
	// Admin API key: any account resolves; regular keys only delete their own.
	const ownerId = isAdminApiRequest(event)
		? null
		: (await validateApiKey(event)).ownerId;
	const id = getRouterParam(event, "id");

	if (!id) {
		return apiError(400, "INVALID_ACCOUNT_ID", "SMTP account id is required");
	}

	const account = await validateSmtpAccountOwnership({
		accountId: String(id),
		ownerId,
	});

	const linkedIdentities = await db
		.select({ id: identities.id, value: identities.value })
		.from(identities)
		.where(eq(identities.smtpAccountId, account.id));

	if (linkedIdentities.length > 0) {
		return apiError(
			409,
			"ACCOUNT_IN_USE",
			"SMTP account is referenced by one or more identities; delete them first",
			linkedIdentities,
		);
	}

	const [accountSecret] = await db
		.select()
		.from(smtpAccountSecrets)
		.where(eq(smtpAccountSecrets.accountId, account.id));

	if (accountSecret) {
		await deleteSecretAdmin(accountSecret.secretId);
	}

	await db.delete(smtpAccounts).where(eq(smtpAccounts.id, account.id));

	return apiSuccess({ id: account.id, deleted: true });
});
