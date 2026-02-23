import { defineEventHandler, getRouterParam, createError } from "h3";
import { createClient } from "../../../../../../lib/create-client";
import { db, decryptAdminSecrets, identities, smtpAccountSecrets } from "@db";
import { eq } from "drizzle-orm";
import { ImapFlow } from "imapflow";

export default defineEventHandler(async (event) => {
	const supabase = await createClient(event);
	const { data, error } = await supabase.auth.getUser();
	if (error || !data.user) {
		throw createError({ statusCode: 401, message: "Unauthorized" });
	}

	const id = getRouterParam(event, "id");

	const [identity] = await db
		.select()
		.from(identities)
		.where(eq(identities.id, String(id)));

	if (!identity || identity.ownerId !== data.user.id) {
		throw createError({ statusCode: 404, message: "Identity not found" });
	}

	if (!identity.smtpAccountId) {
		throw createError({
			statusCode: 400,
			message: "Identity is not an IMAP account",
		});
	}

	const [secrets] = await decryptAdminSecrets({
		linkTable: smtpAccountSecrets,
		foreignCol: smtpAccountSecrets.accountId,
		secretIdCol: smtpAccountSecrets.secretId,
		ownerId: identity.ownerId,
		parentId: String(identity.smtpAccountId),
	});

	const credentials = secrets?.vault?.decrypted_secret
		? JSON.parse(secrets.vault.decrypted_secret)
		: {};

	if (!credentials.IMAP_HOST) {
		throw createError({ statusCode: 400, message: "No IMAP credentials found" });
	}

	const client = new ImapFlow({
		host: credentials.IMAP_HOST,
		port: credentials.IMAP_PORT,
		secure:
			credentials.IMAP_SECURE === "true" || credentials.IMAP_SECURE === true,
		auth: {
			user: credentials.IMAP_USERNAME,
			pass: credentials.IMAP_PASSWORD,
		},
		logger: false,
		logRaw: false,
	});

	try {
		await client.connect();
		const allBoxes = await client.list();
		await client.logout();

		const folders = allBoxes
			.filter((mbx) => !Array.from(mbx.flags ?? []).includes("\\Noselect"))
			.map((mbx) => ({
				path: mbx.path,
				name: mbx.name,
				specialUse: (mbx.specialUse as string) ?? null,
			}));

		return { folders };
	} catch (err: any) {
		throw createError({
			statusCode: 502,
			message: `IMAP connection failed: ${err?.message ?? "Unknown error"}`,
		});
	}
});
