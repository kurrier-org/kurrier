import crypto from "node:crypto";
import {
	createSecretAdmin,
	db,
	smtpAccountSecrets,
	smtpAccounts,
	updateSecretAdmin,
} from "@db";
import { SmtpAccountUpdateSchema } from "@schema";
import { eq } from "drizzle-orm";
import { defineEventHandler, getRouterParam } from "h3";
import {
	apiError,
	apiSuccess,
	isAdminApiRequest,
	validateApiKey,
	validateJSONBody,
} from "../../../../../lib/api-helpers";
import {
	applySmtpConfigUpdate,
	getSmtpAccountSecret,
	serializeSmtpAccount,
	validateSmtpAccountOwnership,
} from "../../../../../lib/smtp-account-helpers";

export default defineEventHandler(async (event) => {
	// Admin API key: any account resolves; regular keys only patch their own.
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

	const { json } = await validateJSONBody(event);
	const parsed = SmtpAccountUpdateSchema.safeParse(json);
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

	const secret = await getSmtpAccountSecret({
		accountId: account.id,
		ownerId: account.ownerId,
	});

	const config = applySmtpConfigUpdate(secret?.config ?? {}, parsed.data);

	if (secret) {
		await updateSecretAdmin(secret.secretId, {
			value: JSON.stringify(config),
		});
	} else {
		// Account rows without a linked secret can exist; heal them here.
		config.ulid = config.ulid ?? crypto.randomUUID();
		const created = await createSecretAdmin({
			ownerId: account.ownerId,
			workspaceId: account.workspaceId,
			name: config.ulid,
			value: JSON.stringify(config),
		});
		await db.insert(smtpAccountSecrets).values({
			accountId: account.id,
			secretId: created.id,
			workspaceId: account.workspaceId,
		});
	}

	const [updated] = await db
		.update(smtpAccounts)
		.set({ updatedAt: new Date() })
		.where(eq(smtpAccounts.id, account.id))
		.returning();

	return apiSuccess(serializeSmtpAccount(updated, config));
});
