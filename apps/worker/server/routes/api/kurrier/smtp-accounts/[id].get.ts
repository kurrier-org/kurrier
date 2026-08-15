import { defineEventHandler, getRouterParam } from "h3";
import {
	apiError,
	apiSuccess,
	validateApiKey,
} from "../../../../../lib/api-helpers";
import {
	getSmtpAccountSecret,
	serializeSmtpAccount,
	validateSmtpAccountOwnership,
} from "../../../../../lib/smtp-account-helpers";

export default defineEventHandler(async (event) => {
	const { ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");

	if (!id) {
		return apiError(400, "INVALID_ACCOUNT_ID", "SMTP account id is required");
	}

	const account = await validateSmtpAccountOwnership({
		accountId: String(id),
		ownerId,
	});

	const secret = await getSmtpAccountSecret({ accountId: account.id, ownerId });

	return apiSuccess(serializeSmtpAccount(account, secret?.config ?? null));
});
