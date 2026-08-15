import { createSecretAdmin, db, smtpAccountSecrets, smtpAccounts } from "@db";
import { SmtpAccountCreateSchema } from "@schema";
import { defineEventHandler } from "h3";
import {
	apiError,
	apiSuccess,
	resolveApiActor,
	validateJSONBody,
} from "../../../../../lib/api-helpers";
import {
	serializeSmtpAccount,
	smtpConfigFromInput,
} from "../../../../../lib/smtp-account-helpers";

export default defineEventHandler(async (event) => {
	const { json } = await validateJSONBody(event);

	const parsed = SmtpAccountCreateSchema.safeParse(json);
	if (!parsed.success) {
		const issues = parsed.error.issues.map((issue) => ({
			path: issue.path.join("."),
			message: issue.message,
			code: issue.code,
		}));
		return apiError(
			400,
			"INVALID_REQUEST_BODY",
			"Invalid request body",
			issues,
		);
	}

	const { ownerId, workspaceId } = await resolveApiActor(
		event,
		parsed.data.userEmail,
	);
	const config = smtpConfigFromInput(parsed.data);

	const [account] = await db
		.insert(smtpAccounts)
		.values({ ownerId, workspaceId })
		.returning();

	const secret = await createSecretAdmin({
		ownerId,
		workspaceId,
		name: config.ulid,
		value: JSON.stringify(config),
	});

	await db.insert(smtpAccountSecrets).values({
		accountId: account.id,
		secretId: secret.id,
		workspaceId,
	});

	return apiSuccess(serializeSmtpAccount(account, config));
});
