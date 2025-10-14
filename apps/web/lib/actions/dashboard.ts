"use server";

import {
	createDrizzleSupabaseClient,
	createSecret,
	getSecret,
	identities,
	IdentityCreate,
	IdentityEntity,
	IdentityInsertSchema,
	mailboxes,
	providers,
	providerSecrets,
	secretsMeta,
	smtpAccounts,
	smtpAccountSecrets,
	updateSecret,
} from "@db";
import {
	DomainIdentityFormSchema,
	FormState,
	getPublicEnv,
	getServerEnv,
	handleAction,
	MailboxKindDisplay,
	ProviderAccountFormSchema,
	Providers,
	PROVIDERS,
	SMTP_MAILBOXES,
	SmtpAccountFormSchema,
	SYSTEM_MAILBOXES,
} from "@schema";
import { currentSession } from "@/lib/actions/auth";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { decode } from "decode-formdata";
import { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { createMailer, DomainIdentity, VerifyResult } from "@providers";
import { parseSecret } from "@/lib/utils";
import { z } from "zod";
import slugify from "@sindresorhus/slugify";
import { rlsClient } from "@/lib/actions/clients";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/server";
import {backfillMailboxes} from "@/lib/actions/mailbox";

const DASHBOARD_PATH = "/dashboard/providers";

export const syncProviders = async () => {
	const rls = await rlsClient();
	await rls((tx) =>
		tx
			.insert(providers)
			.values(PROVIDERS.map((k) => ({ type: k.key })))
			.onConflictDoNothing({ target: [providers.ownerId, providers.type] })
			.returning(),
	);
	const rows = await rls((tx) => tx.select().from(providers));
	return rows;
};

export type SyncProvidersRow = Awaited<
	ReturnType<typeof syncProviders>
>[number];

export async function upsertProviderAccount(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const session = await currentSession();
		const data = decode(formData);
		const parsed = ProviderAccountFormSchema.parse(data);

		const rls = await rlsClient();
		const [providerSecret] = await rls((tx) =>
			tx
				.select()
				.from(providerSecrets)
				.where(eq(providerSecrets.providerId, String(parsed.providerId))),
		);

		if (!providerSecret) {
			const newSecret = await createSecret(session, {
				name: String(parsed.ulid),
				value: JSON.stringify(parsed.required),
			});
			await rls((tx) =>
				tx.insert(providerSecrets).values({
					providerId: String(parsed.providerId),
					secretId: newSecret.id,
				}),
			);
		} else {
			await updateSecret(session, providerSecret.secretId, {
				name: String(parsed.ulid),
				value: JSON.stringify(parsed.required),
			});
		}

		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: "Successfully updated provider account",
		};
	});
}

export async function upsertSMTPAccount(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const session = await currentSession();

		const data = decode(formData);
		const parsed = SmtpAccountFormSchema.parse(data);
		const cleanedOptional = parsed.optional;
		const cleanedRequired = parsed.required;

		const smtpConfig: Record<string, unknown> = {
			ulid: parsed.ulid,
			label: String(parsed.label || "My SMTP Account").trim(),
			...cleanedRequired,
			...cleanedOptional,
		};

		const rls = await rlsClient();

		if (parsed.accountId) {
			const [accountSecret] = await rls((tx) =>
				tx
					.select()
					.from(smtpAccountSecrets)
					.where(eq(smtpAccountSecrets.accountId, String(parsed.accountId))),
			);

			if (!accountSecret) {
				const newSecret = await createSecret(session, {
					name: String(parsed.ulid),
					value: JSON.stringify(smtpConfig),
				});
				await rls((tx) =>
					tx.insert(accountSecret).values({
						providerId: String(parsed.accountId),
						secretId: newSecret.id,
					}),
				);
			} else {
				await updateSecret(session, accountSecret.secretId, {
					value: JSON.stringify(smtpConfig),
				});
			}
		} else {
			const secretMeta = await createSecret(session, {
				name: String(parsed.ulid),
				value: JSON.stringify(smtpConfig),
			});

			const [smtpAccount] = await rls((tx) =>
				tx.insert(smtpAccounts).values({}).returning(),
			);

			await rls((tx) =>
				tx
					.insert(smtpAccountSecrets)
					.values({
						accountId: smtpAccount.id,
						secretId: secretMeta.id,
					})
					.returning(),
			);
		}

		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: "Done",
		};
	});
}

export async function fetchDecryptedSecrets({
	linkTable,
	foreignCol,
	secretIdCol,
	parentId,
}: {
	linkTable: PgTable;
	foreignCol: PgColumn;
	secretIdCol: PgColumn;
	parentId?: string;
}) {
	const rls = await rlsClient();
	const session = await currentSession();

	const rows = await rls((tx) => {
		let q = tx
			.select({
				linkRow: linkTable,
				metaId: secretsMeta.id,
				provider: providers,
				smtpAccount: smtpAccounts,
			})
			.from(linkTable)
			.leftJoin(secretsMeta, eq(secretIdCol, secretsMeta.id))
			.leftJoin(providers, eq(foreignCol, providers.id))
			.leftJoin(smtpAccounts, eq(foreignCol, smtpAccounts.id))
			.$dynamic();

		if (parentId) {
			q = q.where(eq(foreignCol, parentId));
		}

		return q;
	});

	return Promise.all(
		rows.map(async (r) => {
			const metaId = String(r.metaId);
			const { vault } = await getSecret(session, metaId);

			const payload = {
				linkRow: r.linkRow,
				metaId,
				vault,
				providerId: r.linkRow?.providerId,
				accountId: r.linkRow?.accountId,
				provider: r.provider,
				smtpAccount: r.smtpAccount,
			};
			const parsedSecret = parseSecret(
				payload as FetchDecryptedSecretsResult[number],
			);
			return {
				...payload,
				parsedSecret: parsedSecret,
			};
		}),
	);
}

export type FetchDecryptedSecretsResult = Awaited<
	ReturnType<typeof fetchDecryptedSecrets>
>;

export type FetchDecryptedSecretsResultRow =
	FetchDecryptedSecretsResult[number];

export const deleteSmtpAccount = async (id: string): Promise<FormState> => {
	return handleAction(async () => {
		const rls = await rlsClient();
		await rls((tx) => tx.delete(smtpAccounts).where(eq(smtpAccounts.id, id)));
		revalidatePath(DASHBOARD_PATH);
		return {
			success: true,
			message: "Deleted SMTP account",
		};
	});
};

export const verifySmtpAccount = async (
	smtpSecret: FetchDecryptedSecretsResultRow,
): Promise<FormState<VerifyResult>> => {
	return handleAction(async () => {
		const parsedVaultValues = smtpSecret.parsedSecret;
		const session = await currentSession();

		const mailer = createMailer("smtp", parsedVaultValues);
		const res = await mailer.verify(String(smtpSecret?.linkRow?.accountId));
		parsedVaultValues.sendVerified = res?.meta?.send;
		parsedVaultValues.receiveVerified = res?.meta?.receive;

		await updateSecret(session, smtpSecret.metaId, {
			value: JSON.stringify(parsedVaultValues),
		});
		revalidatePath(DASHBOARD_PATH);
		return {
			success: res.ok,
			message: res.message,
			data: res as VerifyResult,
		};
	});
};

export const getProviderById = async (providerId: string) => {
	const rls = await rlsClient();
	const [provider] = await rls((tx) =>
		tx.select().from(providers).where(eq(providers.id, providerId)),
	);
	return provider;
};

export const getIdentityById = async (identityId: string) => {
	const rls = await rlsClient();
	const [identity] = await rls((tx) =>
		tx.select().from(identities).where(eq(identities.id, identityId)),
	);
	return identity;
};

export const getSMTPAccountById = async (accountId: string) => {
	const rls = await rlsClient();
	const [account] = await rls((tx) =>
		tx.select().from(smtpAccounts).where(eq(smtpAccounts.id, accountId)),
	);
	return account;
};

export async function initializeDomainIdentity(
	data: Record<string, unknown>,
): Promise<FormState<{ identity: DomainIdentity }>> {
	return handleAction(async () => {
		const [secret] = await fetchDecryptedSecrets({
			linkTable: providerSecrets,
			foreignCol: providerSecrets.providerId,
			secretIdCol: providerSecrets.secretId,
			parentId: String(
				data.kind === "domain" ? data.providerId : data.smtpAccountId,
			),
		});

		if (!secret) {
			throw new Error("No provider secret found for this selection");
		}

		const providerIdentifier = secret?.provider?.type;
		if (!providerIdentifier) {
			throw new Error("Unsupported provider type or missing provider");
		}

		const decrypted = secret.parsedSecret;
		const mailer = createMailer(providerIdentifier, decrypted);

		const opts = {} as Record<any, any>;
		opts.incoming = String(data?.incomingDomain) === "true";
		if (providerIdentifier === "ses") {
			opts.mailFrom = String(data?.mailFromSubdomain ?? "").trim() || undefined;
		} else if (providerIdentifier === "sendgrid") {
			const { WEB_URL, WEB_PROXY_URL } = getPublicEnv();
			const url = WEB_PROXY_URL ? WEB_PROXY_URL : WEB_URL;
			opts.webHookUrl = `${url}/api/v1/hooks/sendgrid/inbound`;
		}
		const identity = await mailer.addDomain(String(data?.value), opts);

		return {
			success: true,
			message: "Domain identity initialized",
			data: { identity },
		};
	});
}

type DomainIdentityResult = Awaited<
	ReturnType<typeof initializeDomainIdentity>
>;
export async function addNewDomainIdentity(
	_prev: FormState,
	formData: FormData,
): Promise<FormState<DomainIdentityResult["data"]>> {
	return handleAction(async () => {
		const parsed = DomainIdentityFormSchema.parse(decode(formData));
		const { success, data, error } = await initializeDomainIdentity(parsed);
		if (!success || !data?.identity)
			throw new Error(error ?? "Failed to add new identity");

		const identity = data.identity;

		const rls = await rlsClient();
		const payload = {
			kind: parsed.kind,
			value: identity.domain,
			providerId: String(parsed.providerId),
			status: identity.status,
			incomingDomain: String(parsed?.incomingDomain) === "true",
			dnsRecords: identity.dns ?? undefined,
			metaData: identity.meta ?? undefined,
		} satisfies z.infer<typeof IdentityInsertSchema>;

		await rls((tx) => tx.insert(identities).values(payload as IdentityCreate));
		revalidatePath(DASHBOARD_PATH);

		return { success: true, message: "Added new identity", data };
	});
}

export async function verifyDomainIdentity(
	userDomainIdentity: FetchUserIdentitiesResult[number],
	providerAccount: FetchDecryptedSecretsResult[number] | undefined,
): Promise<FormState<DomainIdentity>> {
	return handleAction(async () => {
		// const decrypted = parseSecret(providerAccount);
		const decrypted = providerAccount?.parsedSecret;
		const mailer = createMailer(
			providerAccount?.provider?.type as Providers,
			decrypted,
		);

		const opts = {} as Record<any, any>;

		if (providerAccount?.provider?.type !== "ses") {
			const { WEB_URL, WEB_PROXY_URL } = getPublicEnv();
			const url = WEB_PROXY_URL ? WEB_PROXY_URL : WEB_URL;
			if (providerAccount?.provider?.type === "mailgun") {
				opts.webHookUrl = `${url}/api/v1/hooks/${providerAccount?.provider?.type}/mime`;
			} else {
				opts.webHookUrl = `${url}/api/v1/hooks/${providerAccount?.provider?.type}/inbound`;
			}
		}

		const response = await mailer.verifyDomain(
			userDomainIdentity.identities.value,
			opts,
		);

		const rls = await rlsClient();
		await rls((tx) =>
			tx
				.update(identities)
				.set({
					status: response.status,
				})
				.where(eq(identities.id, userDomainIdentity?.identities.id)),
		);
		revalidatePath(DASHBOARD_PATH);
		return {
			success: true,
			data: response,
		};
	});
}

const initializeEmailIdentity = async (
	data: Record<any, unknown>,
	id: string,
) => {
	return handleAction(async () => {
		const [secret] = await fetchDecryptedSecrets({
			linkTable: providerSecrets,
			foreignCol: providerSecrets.providerId,
			secretIdCol: providerSecrets.secretId,
			parentId: data.providerId as string,
		});
		const decrypted = secret.parsedSecret;
		const mailer = createMailer(secret?.provider?.type as Providers, decrypted);
		const provider = await getProviderById(String(data?.providerId));

		let response = {} as any;
		if (provider.type === "ses") {
			response = await mailer.addEmail(
				String(data?.value),
				`inbound/${provider.ownerId}/${provider.id}/${id}`,
				provider?.metaData?.verification
					? provider?.metaData?.verification
					: {},
			);
		}

		return {
			success: true,
			data: { response, parsedVaultValues: decrypted, secret },
		};
	});
};

export const triggerWorker = async (id: string) => {
	console.log("Listening to mailbox changes on channel:");
	const supabase = await createClient();
	const testChannel = supabase.channel(`smtp-worker`);
	testChannel.subscribe((status) => {
		if (status !== "SUBSCRIBED") {
			return null;
		}
		testChannel.send({
			type: "broadcast",
			event: "backfill",
			payload: { identityId: id },
		});
		testChannel.unsubscribe();

		return;
	});
	return;
};

export const initializeMailboxes = async (emailIdentity: IdentityEntity) => {
	// sanity check: only for email kind
	if (emailIdentity.kind !== "email") return;

	if (emailIdentity.smtpAccountId) {
        await backfillMailboxes(emailIdentity.id)
        return
    }
	// insert one row per mailbox kind
	const rows = SYSTEM_MAILBOXES.map((m) => ({
		ownerId: emailIdentity.ownerId,
		identityId: emailIdentity.id,
		kind: m.kind,
		name: MailboxKindDisplay[m.kind],
		slug: slugify(m.kind), // e.g. "inbox" → URL segment
		isDefault: m.isDefault,
	}));

	const rls = await rlsClient();
	await rls((tx) => {
		return tx.insert(mailboxes).values(rows).onConflictDoNothing().returning();
	});

	// await db.insert(mailboxes).values(
	//     SYSTEM_MAILBOXES.map((m) => ({
	//         ownerId: identity.ownerId,
	//         identityId: identity.id,
	//         kind: m.kind,
	//         name: m.name,
	//         slug: m.slug,
	//         isDefault: m.isDefault,
	//     }))
	// );

	return rows;
};

export async function addNewEmailIdentity(
	_prev: FormState,
	formData: FormData,
) {
	return handleAction(async () => {
		const rls = await rlsClient();
		const data = decode(formData);

		if (data.smtpAccountId) {
			const identityData = IdentityInsertSchema.parse(data);
			const [identity] = await rls((tx) =>
				tx
					.insert(identities)
					.values(identityData as IdentityCreate)
					.returning(),
			);
			await initializeMailboxes(identity);
		} else {
			data.domainIdentityId = data.domain;

			const [domainIdentity] = await rls((tx) =>
				tx
					.select()
					.from(identities)
					.where(eq(identities.id, String(data.domainIdentityId))),
			);

			const id = uuidv4();
			const initRes = await initializeEmailIdentity(data, id);
			if (!initRes.success || !initRes.data) {
				throw new Error("Failed to initialize email identity");
			}
			const { response, parsedVaultValues, secret } = initRes.data;

			data.metaData = response;
			data.id = id;
			const identityData = IdentityInsertSchema.parse(data);
			const [emailIdentity] = await rls((tx) =>
				tx
					.insert(identities)
					.values(identityData as IdentityCreate)
					.returning(),
			);

			const session = await currentSession();
			parsedVaultValues.sendVerified = true;
			parsedVaultValues.receiveVerified = domainIdentity.incomingDomain;
			if (domainIdentity.incomingDomain) {
				await initializeMailboxes(emailIdentity);
			}
			await updateSecret(session, secret.metaId, {
				value: JSON.stringify(parsedVaultValues),
			});
		}

		revalidatePath(DASHBOARD_PATH);
		return {
			success: true,
			message: "Added new identity",
		};
	});
}

export const testSendingEmail = async (
	userIdentity: FetchUserIdentitiesResult[number],
	decryptedSecrets: Record<any, unknown>,
) => {
	return handleAction(async () => {
		if (userIdentity?.smtp_accounts) {
			const mailer = createMailer("smtp", decryptedSecrets);
			await mailer.sendTestEmail(userIdentity.identities.value, {
				subject: "Test email from Kurrier",
				body: "This is a test email from your configured SMTP account in Kurrier.",
			});
			return { success: true, message: "Test email sent successfully." };
		} else if (userIdentity?.providers) {
			const mailer = createMailer(
				userIdentity?.providers.type as Providers,
				decryptedSecrets,
			);
			await mailer.sendTestEmail(userIdentity.identities.value, {
				subject: "Test email from Kurrier",
				from: userIdentity.identities.value,
				body: "This is a test email from your configured account in Kurrier.",
			});
			return { success: true, message: "Test email sent successfully." };
		}

		return { success: false, error: "Provider not supported yet." };
	});
};

export const fetchUserIdentities = async () => {
	const rls = await rlsClient();
	return await rls((tx) =>
		tx
			.select()
			.from(identities)
			.leftJoin(smtpAccounts, eq(identities.smtpAccountId, smtpAccounts.id))
			.leftJoin(providers, eq(identities.providerId, providers.id)),
	);
};

export const deleteDomainIdentity = async (
	userDomainIdentity: FetchUserIdentitiesResult[number],
	providerAccount: FetchDecryptedSecretsResult[number] | undefined,
): Promise<FormState> => {
	return handleAction(async () => {
		const rls = await rlsClient();
		const emailsUsingThisDomain = await rls((tx) =>
			tx
				.select()
				.from(identities)
				.where(
					eq(identities.domainIdentityId, userDomainIdentity?.identities.id),
				),
		);
		if (emailsUsingThisDomain.length > 0) {
			throw new Error(
				"Cannot delete domain identity while email identities are still using it. Please delete associated email identities first.",
			);
		}

		const decrypted = providerAccount?.parsedSecret;
		const mailer = createMailer(
			providerAccount?.provider?.type as Providers,
			decrypted,
		);
		await mailer.removeDomain(String(userDomainIdentity?.identities.value));
		await rls((tx) =>
			tx
				.delete(identities)
				.where(eq(identities.id, userDomainIdentity?.identities.id)),
		);

		revalidatePath(DASHBOARD_PATH);

		return { success: true };
	});
};

export const deleteEmailIdentity = async (
	userIdentity: FetchUserIdentitiesResult[number],
) => {
	return handleAction(async () => {
		const rls = await rlsClient();
		if (!userIdentity.smtp_accounts) {
			const [secret] = await fetchDecryptedSecrets({
				linkTable: providerSecrets,
				foreignCol: providerSecrets.providerId,
				secretIdCol: providerSecrets.secretId,
				parentId: String(userIdentity?.identities.providerId),
			});
			const providerType = userIdentity?.providers?.type as Providers;
			const mailer = createMailer(providerType, secret.parsedSecret);
			if (userIdentity?.providers?.type === "ses") {
				await mailer.removeEmail(userIdentity?.identities?.value, {
					ruleSetName: userIdentity?.identities?.metaData?.ruleSetName,
					ruleName: userIdentity?.identities?.metaData?.ruleName,
				});
			}
		}

		await rls((tx) =>
			tx
				.delete(identities)
				.where(eq(identities.id, String(userIdentity.identities.id))),
		);

		revalidatePath(DASHBOARD_PATH);
		return { success: true, message: "Deleted email identity" };
	});
};

export const verifyProviderAccount = async (
	providerType: Providers,
	providerSecret: FetchDecryptedSecretsResultRow,
) => {
	return handleAction(async () => {
		let res = { ok: false, message: "Not implemented" } as VerifyResult;
		if (providerType === "ses") {
			const mailer = createMailer("ses", providerSecret.parsedSecret);
			const { WEB_URL, WEB_PROXY_URL } = getPublicEnv();
			res = await mailer.verify(String(providerSecret?.metaId), {
				WEB_URL: WEB_PROXY_URL ? WEB_PROXY_URL : WEB_URL,
			});

			const data = providerSecret.parsedSecret;
			data.verified = res.ok;

			const session = await currentSession();
			await updateSecret(session, String(providerSecret?.linkRow?.secretId), {
				value: JSON.stringify(data),
			});

			if (res.ok) {
				const rls = await rlsClient();
				await rls((tx) =>
					tx
						.update(providers)
						.set({
							metaData: {
								...(providerSecret?.provider?.metaData ?? {}),
								...{ verification: res.meta },
							},
						})
						.where(
							eq(providers.id, String(providerSecret?.linkRow?.providerId)),
						),
				);
			}
		} else if (providerType === "mailgun") {
			const mailer = createMailer(providerType, providerSecret.parsedSecret);
			res = await mailer.verify(String(providerSecret?.metaId), {});

			const data = providerSecret.parsedSecret;
			data.verified = res.ok;

			const session = await currentSession();
			await updateSecret(session, String(providerSecret?.linkRow?.secretId), {
				value: JSON.stringify(data),
			});

			if (res.ok) {
				const rls = await rlsClient();
				await rls((tx) =>
					tx
						.update(providers)
						.set({
							metaData: {
								...(providerSecret?.provider?.metaData ?? {}),
								...{ verification: res.meta },
							},
						})
						.where(
							eq(providers.id, String(providerSecret?.linkRow?.providerId)),
						),
				);
			}
		} else if (providerType === "postmark") {
			const mailer = createMailer(providerType, providerSecret.parsedSecret);
			res = await mailer.verify(String(providerSecret?.metaId), {});
			const data = providerSecret.parsedSecret;
			data.verified = res.ok;

			const session = await currentSession();
			await updateSecret(session, String(providerSecret?.linkRow?.secretId), {
				value: JSON.stringify(data),
			});

			if (res.ok) {
				const rls = await rlsClient();
				await rls((tx) =>
					tx
						.update(providers)
						.set({
							metaData: {
								...(providerSecret?.provider?.metaData ?? {}),
								...{ verification: res.meta },
							},
						})
						.where(
							eq(providers.id, String(providerSecret?.linkRow?.providerId)),
						),
				);
			}
		} else if (providerType === "sendgrid") {
			const mailer = createMailer(providerType, providerSecret.parsedSecret);
			res = await mailer.verify(String(providerSecret?.metaId), {});
			const data = providerSecret.parsedSecret;
			data.verified = res.ok;

			const session = await currentSession();
			await updateSecret(session, String(providerSecret?.linkRow?.secretId), {
				value: JSON.stringify(data),
			});

			if (res.ok) {
				const rls = await rlsClient();
				await rls((tx) =>
					tx
						.update(providers)
						.set({
							metaData: {
								...(providerSecret?.provider?.metaData ?? {}),
								...{ verification: res.meta },
							},
						})
						.where(
							eq(providers.id, String(providerSecret?.linkRow?.providerId)),
						),
				);
			}
		}

		revalidatePath(DASHBOARD_PATH);

		return { success: true, data: res };
	});
};

export type FetchUserIdentitiesResult = Awaited<
	ReturnType<typeof fetchUserIdentities>
>;

// export const disconnectProviderAccount = async (
//     providerType: Providers,
//     providerSecret: FetchDecryptedSecretsResultRow,
// ) => {
//     return handleAction(async () => {
//         let res = { ok: false, message: "Not implemented" } as VerifyResult;
//         if (providerType === "ses") {
//             const mailer = createMailer("ses", providerSecret.parsedSecret);
//             const { WEB_URL, WEB_PROXY_URL } = getPublicEnv();
//         }
//
//         revalidatePath(DASHBOARD_PATH);
//
//         return { success: true, data: res };
//     });
// };
