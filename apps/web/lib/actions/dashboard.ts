"use server";

import {
	apiKeys, createSecret, davAccounts,
	db, deleteSecretAdmin, draftMessages, driveEntries,
	driveVolumes,
	getSecret, googleAccounts,
	identities,
	IdentityCreate,
	IdentityEntity,
	IdentityInsertSchema,
	mailboxes, messageAttachments,
	messages,
	providers,
	providerSecrets,
	secretsMeta,
	smtpAccounts,
	smtpAccountSecrets,
	updateSecret, WebhookInsertEntity, webhooks, workspaceMembers,
} from "@db";
import {
	apiScopeList,
	CustomEmailProviderCredentialsSchema,
	defaultImapQuota,
	DomainIdentityFormSchema,
	FormState,
	getPublicEnv,
	handleAction,
	MailboxKindDisplay,
	materializeCustomEmailProvider,
	parseCustomEmailProviders,
	ProviderAccountFormSchema,
	Providers,
	SmtpAccountFormSchema,
	SYSTEM_MAILBOXES,
} from "@schema";
import { currentSession, isSignedIn } from "@/lib/actions/auth";
import {and, count, eq, sql, gte, desc, sum, countDistinct} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { decode } from "decode-formdata";
import { PgColumn, PgTable } from "drizzle-orm/pg-core";
import {
	createMailer,
	loadMicrosoftCredentials,
	createStore,
	DomainIdentity, gmailClientForGoogleAccount,
	VerifyResult,
} from "@providers";
import { parseSecret } from "@/lib/utils";
import { z } from "zod";
import slugify from "@sindresorhus/slugify";
import {getWorkspaceId, getWorkspaceRole, rlsClient} from "@/lib/actions/clients";
import { v4 as uuidv4 } from "uuid";
import {backfillGoogleMailboxes, backfillMailboxes, clearImapClients} from "@/lib/actions/mailbox";
import { kvGet } from "@common";
import { nanoid } from "nanoid";
import { getRedis } from "@/lib/actions/get-redis";
import {
	checkDefaultWorkspaceIdentity,
} from "@/lib/actions/workspace";
import {workspaceIdentityMembers} from "@db";
import { DISTRIBUTION_CONFIG } from "@distribution/config";
import {
	createEmailIdentity,
	createSMTPAccount,
	updateSMTPAccount,
	verifySMTPAccount
} from "@/lib/actions/email-identity";

const DASHBOARD_PATH = "/w/[workspaceId]/dashboard/providers";
const CURRENT_API_VERSION = 1;

export const syncProviders = async () => {
	const rls = await rlsClient();
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
		const workspaceId = await getWorkspaceId();
		const parsed = ProviderAccountFormSchema.parse(data);

		const rls = await rlsClient();
		if (!DISTRIBUTION_CONFIG.features.drive) {
			const [provider] = await rls((tx) =>
				tx
					.select({ type: providers.type })
					.from(providers)
					.where(eq(providers.id, String(parsed.providerId))),
			);
			if (provider?.type === "s3") {
				throw new Error("Drive is disabled");
			}
		}
		const [providerSecret] = await rls((tx) =>
			tx
				.select()
				.from(providerSecrets)
				.where(eq(providerSecrets.providerId, String(parsed.providerId))),
		);

		if (!providerSecret) {
			const newSecret = await createSecret(session, workspaceId, {
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
			await updateSecret(session, workspaceId, providerSecret.secretId, {
				name: String(parsed.ulid),
				value: JSON.stringify(parsed.required),
			});
		}

		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: "dashboard.providerAccountUpdated",
		};
	});
}

export async function upsertSMTPAccount(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const data = decode(formData);
		const parsed = SmtpAccountFormSchema.parse(data);

		const input = {
			label: parsed.label
				? String(parsed.label)
				: undefined,
			ulid: String(parsed.ulid),
			required: parsed.required,
			optional: parsed.optional,
		};

		const result = parsed.accountId
			? await updateSMTPAccount({
				...input,
				accountId: String(parsed.accountId),
			})
			: await createSMTPAccount(input);

		if (!result.success) {
			return result;
		}

		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: result.message || "dashboard.done",
		};
	});
}

export async function connectCustomEmailProvider(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const credentials = CustomEmailProviderCredentialsSchema.parse(
			decode(formData),
		);
		const preset = parseCustomEmailProviders().find(
			(provider) => provider.id === credentials.presetId,
		);

		if (!preset) {
			throw new Error("dashboard.customProviderUnavailable");
		}

		const smtpConfig = materializeCustomEmailProvider(preset, credentials);
		const displayName = credentials.displayName ?? "";
		const workspaceId = await getWorkspaceId();
		const rls = await rlsClient();

		if (preset.imap) {
			if (!displayName) {
				throw new Error("dashboard.displayNameRequired");
			}

			const [existingIdentity] = await rls((tx) =>
				tx
					.select({
						publicId: identities.publicId,
						mailboxSlug: mailboxes.slug,
					})
					.from(identities)
					.leftJoin(
						mailboxes,
						and(
							eq(mailboxes.identityId, identities.id),
							eq(mailboxes.kind, "inbox"),
						),
					)
					.where(
						and(
							eq(identities.workspaceId, workspaceId),
							eq(identities.kind, "email"),
							eq(identities.value, smtpConfig.SMTP_USERNAME),
						),
					)
					.limit(1),
			);

			if (existingIdentity) {
				return {
					success: true,
					message: "dashboard.mailboxAlreadyConnected",
					data: {
						identityPublicId: existingIdentity.publicId,
						mailboxSlug: existingIdentity.mailboxSlug ?? undefined,
					},
				};
			}
		}

		const { label, ulid, ...connectionConfig } = smtpConfig;
		const accountResult = await createSMTPAccount({
			label,
			ulid,
			required: connectionConfig,
		});

		if (!accountResult.success || !accountResult.data?.accountId) {
			return accountResult;
		}
		const accountId = accountResult.data.accountId;

		if (!preset.imap) {
			revalidatePath(DASHBOARD_PATH);
			return {
				success: true,
				message: "dashboard.customProviderAccountAdded",
			};
		}

		const identityResult = await createEmailIdentity({
			dailyQuota: credentials.dailyQuota,
			displayName,
			email: smtpConfig.SMTP_USERNAME,
			smtpAccountId: accountId,
		});

		if (!identityResult.success) {
			await deleteSmtpAccount(accountId);
			return identityResult;
		}

		const [emailIdentity] = await rls((tx) =>
			tx
				.select({
					publicId: identities.publicId,
					mailboxSlug: mailboxes.slug,
				})
				.from(identities)
				.leftJoin(
					mailboxes,
					and(
						eq(mailboxes.identityId, identities.id),
						eq(mailboxes.kind, "inbox"),
					),
				)
				.where(eq(identities.smtpAccountId, accountId))
				.limit(1),
		);

		const mailboxSlug = emailIdentity?.mailboxSlug ?? undefined;
		revalidatePath(DASHBOARD_PATH);
		revalidatePath("/w/[wPublicId]/dashboard/mail", "layout");

		return {
			success: true,
			message: mailboxSlug
				? "dashboard.customProviderMailboxConnected"
				: "dashboard.customProviderMailboxSyncing",
			data: emailIdentity?.publicId
				? {
						identityPublicId: emailIdentity.publicId,
						mailboxSlug,
					}
				: undefined,
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
				encryptedValue: secretsMeta.encryptedValue,
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
			const workspaceId = await getWorkspaceId();
			const { vault } = await getSecret(session, metaId, workspaceId);

			const payload = {
				linkRow: r.linkRow,
				metaId,
				encryptedValue: r.encryptedValue,
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

		await rls(async (tx) => {
			const [accountSecret] = await tx.select().from(smtpAccountSecrets).where(eq(
				smtpAccountSecrets.accountId,
				id
			))
			if (accountSecret) {
				await deleteSecretAdmin(accountSecret.secretId);
				await tx.delete(smtpAccounts).where(eq(smtpAccounts.id, id))
			}
		});
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
	const result = await verifySMTPAccount(
		String(smtpSecret.linkRow?.accountId),
	);
	revalidatePath(DASHBOARD_PATH);
	return result;
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
			throw new Error("dashboard.noProviderSecretFound");
		}

		const providerIdentifier = secret?.provider?.type;
		if (!providerIdentifier) {
			throw new Error("dashboard.unsupportedProviderType");
		}

		const decrypted = secret.parsedSecret;
		const mailer = createMailer(providerIdentifier, decrypted);

		const opts = {} as Record<any, any>;
		opts.incoming = String(data?.incomingDomain) === "true";
		if (providerIdentifier === "ses") {
			opts.mailFrom = String(data?.mailFromSubdomain ?? "").trim() || undefined;
		} else if (providerIdentifier === "sendgrid") {
			const { WEB_URL } = getPublicEnv();
			const localTunnelUrl = await kvGet("local-tunnel-url");
			const url = localTunnelUrl ? localTunnelUrl : WEB_URL;
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
			throw new Error(error ?? "dashboard.failedToAddIdentity");

		const identity = data.identity;

		const rls = await rlsClient();
		const payload = {
			kind: parsed.kind,
			value: identity.domain,
			providerId: String(parsed.providerId),
			status: identity.status,
			incomingDomain: String(parsed?.incomingDomain) === "true",
			dnsRecords: identity.dns ?? undefined,
			metaData: identity.meta ?? undefined
		} satisfies z.infer<typeof IdentityInsertSchema>;
		const [domainIdentity] = await rls(async (tx) => {
			return tx.insert(identities).values(payload as IdentityCreate)
		});
		// await addIdentityOwnerGrant(domainIdentity)
		revalidatePath(DASHBOARD_PATH);

		return { success: true, message: "dashboard.addedNewIdentity", data };
	});
}

export async function verifyDomainIdentity(
	userDomainIdentity: FetchUserIdentitiesResult[number],
	providerAccount: FetchDecryptedSecretsResult[number] | undefined,
): Promise<FormState<DomainIdentity>> {
	return handleAction(async () => {
		const decrypted = providerAccount?.parsedSecret;
		const mailer = createMailer(
			providerAccount?.provider?.type as Providers,
			decrypted,
		);

		const opts = {} as Record<any, any>;

		if (providerAccount?.provider?.type !== "ses") {
			const { WEB_URL } = getPublicEnv();
			const localTunnelUrl = await kvGet("local-tunnel-url");
			const url = localTunnelUrl ? localTunnelUrl : WEB_URL;
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

export const initializeMailboxes = async (emailIdentity: IdentityEntity, userId: string, workspaceId: string) => {
	if (emailIdentity.kind !== "email") return;

	if ((emailIdentity.metaData as any)?.provider === "google") {
		await backfillGoogleMailboxes(
			emailIdentity.id,
			emailIdentity.workspaceId,
		);
		return;
	}

	if (emailIdentity.smtpAccountId) {
		await backfillMailboxes(emailIdentity.id, emailIdentity.workspaceId);
		return;
	}

	const rows = SYSTEM_MAILBOXES.map((m) => ({
		ownerId: emailIdentity.ownerId,
		workspaceId: emailIdentity.workspaceId,
		identityId: emailIdentity.id,
		kind: m.kind,
		name: MailboxKindDisplay[m.kind],
		slug: slugify(m.kind),
		isDefault: m.isDefault,
	}));

	const rls = await rlsClient();
	await rls(async (tx) => {
		await tx.insert(mailboxes).values(rows).onConflictDoNothing().returning();
		const { davQueue } = await getRedis();
		await davQueue.add("dav:create-identity", { identityId: emailIdentity.id, userId, workspaceId }, { jobId: `identity-dav-bootstrap-${emailIdentity.id}` });
		return
	});
	return rows;
};


const assignWorkspaceMembersToIdentity = async (
	identity: IdentityEntity,
	list: string
) => {
	const rls = await rlsClient();

	const listIds = list ? list.split(",").filter(Boolean) : [];
	if (!listIds.length) return;

	await rls((tx) =>
		tx.insert(workspaceIdentityMembers).values(
			listIds.map((userId) => ({
				identityId: identity.id,
				userId,
			}))
		)
	);
};

export const assignIdentityToAllWorkspaceMembers = async (
	identity: IdentityEntity
) => {
	const rls = await rlsClient();

	const members = await rls((tx) => tx.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, identity.workspaceId)));
	const listIds = members.map(m => m.userId);
	if (!listIds.length) return;

	await rls((tx) =>
		tx.insert(workspaceIdentityMembers).values(
			listIds.map((userId) => ({
				identityId: identity.id,
				userId,
			}))
		)
	);
};
export async function addNewEmailIdentity(
	_prev: FormState,
	formData: FormData,
) {
	return handleAction(async () => {
		const rls = await rlsClient();
		const data = decode(formData) as Record<string, any>;

		const sharedWithWorkspace = true

		if (!sharedWithWorkspace) {
			const workspaceMembers = data?.workspaceMembers as string[] | undefined;

			if (!workspaceMembers?.length) {
				return {
					success: false,
					error: "dashboard.mustAssignAtLeastOneMember",
				};
			}
		}

		const workspaceId = await getWorkspaceId();
		const userId = String((await isSignedIn())?.id);

		if (!userId) {
			return {
				success: false,
				error: "dashboard.notSignedIn",
			};
		}

		if (data.googleAccountId) {
			console.log("[GOOGLE BRANCH]", {

				googleAccountId: data.googleAccountId,
				workspaceId,
			});

			const [googleAccount] = await db
				.select()
				.from(googleAccounts)
				.where(
					and(
						eq(googleAccounts.id, String(data.googleAccountId)),
						eq(googleAccounts.workspaceId, workspaceId),
					),
				)
				.limit(1);

			if (!googleAccount) {
				return {
					success: false,
					error: "dashboard.googleAccountNotFound",
				};
			}

			if (googleAccount.status !== "connected") {
				return {
					success: false,
					error: "dashboard.googleAccountNotConnected",
				};
			}

			const identityData = IdentityInsertSchema.parse({
				workspaceId,
				ownerId: userId,
				value: googleAccount.email,
				displayName: data.displayName || googleAccount.name || googleAccount.email,
				kind: "email",
				sharedWithWorkspace,
				metaData: {
					provider: "google",
					dailyQuota: Number(data.dailyQuota) || defaultImapQuota,
					sharedWithWorkspace,
					gmail: {
						googleAccountId: googleAccount.id,
					},
				},
			});

			const [identity] = await db
				.insert(identities)
				.values(identityData as IdentityCreate)
				.returning();

			console.log("[GOOGLE IDENTITY INSERTED]", identity.id);

			await db
				.update(googleAccounts)
				.set({
					identityId: identity.id,
					updatedAt: new Date(),
				})
				.where(eq(googleAccounts.id, googleAccount.id));

			await checkDefaultWorkspaceIdentity();

			if (sharedWithWorkspace) {
				await assignIdentityToAllWorkspaceMembers(identity);
			} else {
				await assignWorkspaceMembersToIdentity(
					identity,
					data.workspaceMembers as string,
				);
			}

			console.log("[GOOGLE BEFORE INIT MAILBOXES]", identity.id);
			try {
				await initializeMailboxes(identity, userId, workspaceId);
			} catch (err) {
				console.error("[GOOGLE MAILBOX INIT FAILED]", err);
			}

			revalidatePath(DASHBOARD_PATH);

			return {
				success: true,
				message: "dashboard.addedGoogleEmailIdentity",
			};
		}

		if (data.smtpAccountId) {
			const result = await createEmailIdentity({
				email: String(data.value),
				displayName: data.displayName
					? String(data.displayName)
					: undefined,
				smtpAccountId: String(data.smtpAccountId),
				dailyQuota: Number(data.dailyQuota) || defaultImapQuota,
			});
			if (!result.success) {
				return result;
			}
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
			data.sharedWithWorkspace = sharedWithWorkspace;

			const identityData = IdentityInsertSchema.parse({
				workspaceId,
				ownerId: userId,
				...data,
			});

			const [emailIdentity] = await db
				.insert(identities)
				.values(identityData as IdentityCreate)
				.returning();

			await checkDefaultWorkspaceIdentity();

			if (sharedWithWorkspace) {
				await assignIdentityToAllWorkspaceMembers(emailIdentity);
			} else {
				await assignWorkspaceMembersToIdentity(
					emailIdentity,
					data.workspaceMembers as string,
				);
			}

			const session = await currentSession();

			parsedVaultValues.sendVerified = true;
			parsedVaultValues.receiveVerified = domainIdentity.incomingDomain;

			if (domainIdentity.incomingDomain) {
				await initializeMailboxes(emailIdentity, userId, workspaceId);
			}

			await updateSecret(session, workspaceId, secret.metaId, {
				value: JSON.stringify(parsedVaultValues),
			});
		}

		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: "dashboard.addedNewIdentity",
		};
	});
}

export const testSendingEmail = async (
	userIdentity: FetchUserIdentitiesResult[number],
	decryptedSecrets: Record<any, unknown>,
) => {
	return handleAction(async () => {
		if (userIdentity?.smtp_accounts) {
			let smtpCredentials = decryptedSecrets;
			if (decryptedSecrets.provider === "microsoft") {
				const [smtpSecret] = await fetchDecryptedSecrets({
					linkTable: smtpAccountSecrets,
					foreignCol: smtpAccountSecrets.accountId,
					secretIdCol: smtpAccountSecrets.secretId,
					parentId: String(userIdentity.smtp_accounts.id),
				});
				if (!smtpSecret) throw new Error("SMTP account secret not found");
				const session = await currentSession();
				const workspaceId = await getWorkspaceId();
				smtpCredentials = await loadMicrosoftCredentials(smtpSecret.parsedSecret, {
					key: smtpSecret.metaId,
					distributed: true,
					persist: async (next) => {
						await updateSecret(session, workspaceId, smtpSecret.metaId, {
							value: JSON.stringify(next),
							expectedEncryptedValue: String(smtpSecret.encryptedValue),
						});
					},
					load: async () => {
						const [latest] = await fetchDecryptedSecrets({
							linkTable: smtpAccountSecrets,
							foreignCol: smtpAccountSecrets.accountId,
							secretIdCol: smtpAccountSecrets.secretId,
							parentId: String(userIdentity.smtp_accounts.id),
						});
						return latest?.parsedSecret ?? null;
					},
				});
			}
			const mailer = createMailer("smtp", smtpCredentials);

			const ok = await mailer.sendTestEmail(userIdentity.identities.value, {
				subject: "Test email from Kurrier",
				body: "This is a test email from your configured SMTP account in Kurrier.",
			});

			return ok
				? { success: true, message: "Test email sent successfully." }
				: { success: false, error: "Failed to send test email." };
		}

		if (userIdentity?.providers) {
			const mailer = createMailer(
				userIdentity.providers.type as Providers,
				decryptedSecrets,
			);

			const ok = await mailer.sendTestEmail(userIdentity.identities.value, {
				subject: "Test email from Kurrier",
				from: userIdentity.identities.value,
				body: "This is a test email from your configured account in Kurrier.",
			});

			return ok
				? { success: true, message: "Test email sent successfully." }
				: { success: false, error: "Failed to send test email." };
		}

		if (userIdentity?.identities?.metaData?.provider === "google") {
			const mailer = createMailer("google" as Providers, {
				identityId: userIdentity.identities.id,
			});

			const ok = await mailer.sendTestEmail(userIdentity.identities.value, {
				subject: "Test email from Kurrier",
				from: userIdentity.identities.value,
				body: "This is a test email from your connected Gmail account in Kurrier.",
			});

			return ok
				? { success: true, message: "Test email sent successfully." }
				: { success: false, error: "Failed to send test email." };
		}

		return { success: false, error: "Provider not supported yet." };
	});
};

export const fetchUserIdentities = async () => {
	const workspaceId = await getWorkspaceId();
	return db.select()
		.from(identities)
		.leftJoin(smtpAccounts, eq(identities.smtpAccountId, smtpAccounts.id))
		.leftJoin(providers, eq(identities.providerId, providers.id))
		.where(and(
			eq(identities.workspaceId, workspaceId)
		))
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

const cleanupIdentity = async (identityId: string, workspaceId: string) => {
	const { davQueue, davEvents } = await getRedis();
	const job = await davQueue.add("dav:delete:identity", { identityId , workspaceId }, { jobId: `identity-dav-cleanup-${identityId}` });
	await job.waitUntilFinished(davEvents);
};

const enqueueIdentityCleanup = async (identityId: string, workspaceId: string) => {
	const { davQueue } = await getRedis();

	await davQueue.add(
		"dav:delete:identity",
		{ identityId, workspaceId },
		{
			jobId: `identity-dav-cleanup-${identityId}`,
			removeOnComplete: true,
			removeOnFail: false,
			attempts: 3,
			backoff: {
				type: "exponential",
				delay: 5000,
			},
		},
	);
};

export const deleteEmailIdentity = async (
	userIdentity: FetchUserIdentitiesResult[number],
) => {
	return handleAction(async () => {
		const identity = userIdentity.identities;
		const isGoogle = identity?.metaData?.provider === "google";

		if (isGoogle) {
			const mailer = createMailer("google" as Providers, {
				identityId: identity.id,
			});

			await mailer.removeEmail(identity.value, {
				revoke: true,
			});

			await db
				.update(googleAccounts)
				.set({
					identityId: null,
					updatedAt: new Date(),
				})
				.where(eq(googleAccounts.identityId, identity.id));
		} else if (!userIdentity.smtp_accounts) {
			const [secret] = await fetchDecryptedSecrets({
				linkTable: providerSecrets,
				foreignCol: providerSecrets.providerId,
				secretIdCol: providerSecrets.secretId,
				parentId: String(identity.providerId),
			});

			const providerType = userIdentity.providers?.type as Providers;
			const mailer = createMailer(providerType, secret.parsedSecret);

			if (providerType === "ses") {
				await mailer.removeEmail(identity.value, {
					ruleSetName: identity.metaData?.ruleSetName,
					ruleName: identity.metaData?.ruleName,
				});
			}
		} else {
			await clearImapClients(identity.id);
		}

		await enqueueIdentityCleanup(identity.id, identity.workspaceId);

		await db
			.delete(identities)
			.where(eq(identities.id, identity.id));

		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: "Deleted email identity",
		};
	});
};

export const verifyProviderAccount = async (
	providerType: Providers,
	providerSecret: FetchDecryptedSecretsResultRow,
) => {
	return handleAction(async () => {
		let res = { ok: false, message: "Not implemented" } as VerifyResult;
		const workspaceId = await getWorkspaceId();
		if (providerType === "ses") {
			const mailer = createMailer("ses", providerSecret.parsedSecret);
			const { WEB_URL } = getPublicEnv();
			const localTunnelUrl = await kvGet("local-tunnel-url");
			res = await mailer.verify(String(providerSecret?.metaId), {
				webHookUrl: `${localTunnelUrl ? localTunnelUrl : WEB_URL}/api/v1/hooks/aws/ses/inbound`,
			});

			const data = providerSecret.parsedSecret;
			data.verified = res.ok;

			const session = await currentSession();
			await updateSecret(session, workspaceId, String(providerSecret?.linkRow?.secretId), {
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
		} else if (providerType === "s3") {
			const store = createStore(providerType, providerSecret.parsedSecret);
			res = await store.verify(String(providerSecret?.metaId), {});
			const data = providerSecret.parsedSecret;
			data.verified = res.ok;
			const session = await currentSession();
			await updateSecret(session, workspaceId,  String(providerSecret?.linkRow?.secretId), {
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
			await updateSecret(session, workspaceId, String(providerSecret?.linkRow?.secretId), {
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
			await updateSecret(session, workspaceId, String(providerSecret?.linkRow?.secretId), {
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
			await updateSecret(session, workspaceId, String(providerSecret?.linkRow?.secretId), {
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

export const getDashboardStats = async () => {
	return handleAction(async () => {
		const rls = await rlsClient();
		const workspaceRole = await getWorkspaceRole();
		const isOwner = workspaceRole === "owner";

		const data = await rls(async (tx) => {
			const [
				[messageCount],
				[messageCount24h],
				[threadCount],
				[draftCount],
				[scheduledDraftCount],
				[attachmentCount],
				[rawMessageStorage],
				[attachmentStorage],
			] = await Promise.all([
				tx.select({ count: count() }).from(messages),

				tx
					.select({ count: count() })
					.from(messages)
					.where(gte(messages.createdAt, sql`now() - interval '24 hours'`)),

				tx.select({ count: countDistinct(messages.threadId) }).from(messages),

				tx.select({ count: count() }).from(draftMessages),

				tx
					.select({ count: count() })
					.from(draftMessages)
					.where(eq(draftMessages.status, "scheduled")),

				tx.select({ count: count() }).from(messageAttachments),

				tx.select({ bytes: sum(messages.sizeBytes) }).from(messages),

				tx.select({ bytes: sum(messageAttachments.sizeBytes) }).from(messageAttachments),
			]);

			let connectedProviders = null as number | null;
			let verifiedDomains = null as number | null;
			let activeIdentities = null as number | null;
			let volumeCount = null as number | null;
			let driveEntryCount = null as number | null;
			let driveStorageBytes = 0;

			if (isOwner) {
				const [
					[providerCount],
					[smtpCount],
					[verifiedDomainCount],
					[identityCount],
					[driveVolumeCount],
					[driveEntriesCount],
					[driveStorage],
				] = await Promise.all([
					tx.select({ count: count() }).from(providers),

					tx.select({ count: count() }).from(smtpAccounts),

					tx
						.select({ count: count() })
						.from(identities)
						.where(
							and(
								eq(identities.kind, "domain"),
								eq(identities.status, "verified"),
							),
						),

					tx
						.select({ count: count() })
						.from(identities)
						.where(eq(identities.kind, "email")),

					tx.select({ count: count() }).from(driveVolumes),

					tx.select({ count: count() }).from(driveEntries),

					tx.select({ bytes: sum(driveEntries.sizeBytes) }).from(driveEntries),
				]);

				connectedProviders =
					Number(providerCount?.count ?? 0) + Number(smtpCount?.count ?? 0);
				verifiedDomains = Number(verifiedDomainCount?.count ?? 0);
				activeIdentities = Number(identityCount?.count ?? 0);
				volumeCount = Number(driveVolumeCount?.count ?? 0);
				driveEntryCount = Number(driveEntriesCount?.count ?? 0);
				driveStorageBytes = Number(driveStorage?.bytes ?? 0);
			}

			const rawMessageBytes = Number(rawMessageStorage?.bytes ?? 0);
			const attachmentBytes = Number(attachmentStorage?.bytes ?? 0);
			const totalStorageBytes = rawMessageBytes + driveStorageBytes;

			return {
				isOwner,

				connectedProviders,
				verifiedDomains,
				activeIdentities,
				volumeCount,
				driveEntryCount,

				emailsProcessedTotal: Number(messageCount?.count ?? 0),
				emailsProcessed24h: Number(messageCount24h?.count ?? 0),
				threadCount: Number(threadCount?.count ?? 0),
				draftCount: Number(draftCount?.count ?? 0),
				scheduledDraftCount: Number(scheduledDraftCount?.count ?? 0),
				attachmentCount: Number(attachmentCount?.count ?? 0),

				rawMessageBytes,
				attachmentBytes,
				driveStorageBytes,
				totalStorageBytes,
				storageBytesUsed: totalStorageBytes,
				isStorageOverLimit: false,
			};
		});

		return { success: true, message: "OK", data };
	});
};

export async function addApiKey(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const session = await currentSession();
		const data = decode(formData);
		const workspaceId = await getWorkspaceId();

		const { ulid, name, scope } = data as {
			ulid: string;
			name: string;
			scope: string;
		};

		type ApiScope = (typeof apiScopeList)[number];

		const isApiScope = (s: string): s is ApiScope =>
			(apiScopeList as readonly string[]).includes(s);

		const scopesRaw = scope.split(",").map((s) => s.trim());
		const scopesClean = scopesRaw.filter(isApiScope);

		const finalScopes: ApiScope[] = scopesClean.length
			? scopesClean
			: (["emails:send"] as ApiScope[]);

		const keyPrefix = nanoid(6);
		const rawKey = `${keyPrefix}.${nanoid(32)}`;
		const keyLast4 = rawKey.slice(-4);

		const secretMeta = await createSecret(session, workspaceId, {
			name: ulid,
			value: JSON.stringify({ rawKey }),
		});

		const rls = await rlsClient();
		await rls((tx) =>
			tx
				.insert(apiKeys)
				.values({
					name: name.trim(),
					secretId: secretMeta.id,
					keyPrefix,
					keyLast4,
					keyVersion: CURRENT_API_VERSION,
					scopes: finalScopes,
					metaData: { ulid },
				})
				.returning(),
		);

		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: "dashboard.apiKeyCreated",
		};
	});
}

export const fetchUserAPIKeys = async () => {
	const rls = await rlsClient();
	const session = await currentSession();
	const workspaceId = await getWorkspaceId();

	const apiKeyRows = await rls((tx) =>
		tx
			.select({
				key: apiKeys,
				metaId: secretsMeta.id,
			})
			.from(apiKeys)
			.leftJoin(secretsMeta, eq(apiKeys.secretId, secretsMeta.id))
			.orderBy(desc(apiKeys.createdAt))
	);

	const userApiKeys = await Promise.all(
		apiKeyRows.map(async (r) => {
			const { vault } = await getSecret(session, String(r.metaId), workspaceId);
			return {
				...r.key,
				vault: vault?.decrypted_secret
					? JSON.parse(vault.decrypted_secret)
					: {},
			};
		}),
	);

	return userApiKeys;
};

export type FetchUserAPIKeysResult = Awaited<
	ReturnType<typeof fetchUserAPIKeys>
>;



export const regenerateDavPassword = async () => {
	const { davEvents, davQueue } = await getRedis();
	const user = await isSignedIn();
	const workspaceId = await getWorkspaceId();
	const job = await davQueue.add("dav:update-password", { userId: user?.id, workspaceId });
	await job.waitUntilFinished(davEvents);
	revalidatePath("/w/[workspaceId]/dashboard/platform/sync-services");
	return job.returnvalue;
};


export async function addNewVolume(_prev: FormState, formData: FormData) {
	return handleAction(async () => {
		if (!DISTRIBUTION_CONFIG.features.drive) {
			throw new Error("Drive is disabled");
		}

		const rls = await rlsClient();
		const data = decode(formData);
		const user = await isSignedIn();

		const label = String(data.volumeName || data.bucketName || "").trim();

		if (!label) {
			return { success: false, error: "dashboard.volumeNameRequired" };
		}

		const code = label
			.toLowerCase()
			.replace(/[^a-z0-9-]+/g, "-")
			.replace(/^-+|-+$/g, "");

		if (!code) {
			return { success: false, error: "dashboard.invalidVolumeName" };
		}

		const bucket = process.env.S3_BUCKET;

		if (!bucket) {
			return { success: false, error: "dashboard.s3BucketNotConfigured" };
		}

		await rls((tx) =>
			tx.insert(driveVolumes).values({
				ownerId: String(user?.id),
				label,
				kind: "cloud",
				code,
				providerId: null,
				metaData: {
					bucket,
				},
			}),
		);

		revalidatePath(
			"/[locale]/w/[wPublicId]/dashboard/platform/storage",
			"page",
		);

		return {
			success: true,
			message: "dashboard.addedNewVolume",
		};
	});
}


export const fetchUserWebhooks = async () => {
	const rls = await rlsClient();

	const hookRows = await rls((tx) =>
		tx
			.select()
			.from(webhooks)
			.leftJoin(identities, eq(webhooks.identityId, identities.id))

	);

	return hookRows;
};

export type FetchUserWebhooksResult = Awaited<
	ReturnType<typeof fetchUserWebhooks>
>;



export async function addWebhook(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const data = decode(formData);
		const insertPayload = {
			url: data.url,
			identityId: data.identityId ?? null,
			events: [data.scope],
		};

		const rls = await rlsClient();
		await rls((tx) =>
			tx
				.insert(webhooks)
				.values(insertPayload as WebhookInsertEntity)
		);
		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: "dashboard.webhookCreated",
		};
	});
}

export const deleteWebhook = async (
	_prev: FormState,
	formData: FormData,
): Promise<FormState> => {
	return handleAction(async () => {
		const data = decode(formData);
		const rls = await rlsClient();
		await rls((tx) =>
			tx.delete(webhooks).where(eq(webhooks.id, String(data.id))),
		);

		revalidatePath(DASHBOARD_PATH);
		return {
			success: true,
		};
	});
};


export const fetchUserDavAccountForWorkspace = async () => {
	const rls = await rlsClient();
	const session = await currentSession();
	const user = await isSignedIn();
	const workspaceId = await getWorkspaceId();

	const [row] = await rls((tx) =>
		tx
			.select({
				account: davAccounts,
				metaId: secretsMeta.id,
			})
			.from(davAccounts)
			.leftJoin(secretsMeta, eq(davAccounts.secretId, secretsMeta.id))
			.where(
				and(
					eq(davAccounts.workspaceId, workspaceId),
					eq(davAccounts.ownerId, String(user?.id)),
					eq(davAccounts.type, "user"),
				),
			)
			.limit(1),
	);

	if (!row) return null;

	const { vault } = await getSecret(session, String(row.metaId), workspaceId);

	return {
		...row.account,
		password: vault?.decrypted_secret || null,
	};
};



export async function fetchGoogleAccounts() {
	const rls = await rlsClient();
	return rls((tx) =>
		tx
			.select()
			.from(googleAccounts)
			.orderBy(desc(googleAccounts.createdAt)),
	);
}
export type FetchGoogleAccountsResult = Awaited<
	ReturnType<typeof fetchGoogleAccounts>
>;
export type FetchGoogleAccountsResultRow = FetchGoogleAccountsResult[number];


export const verifyGoogleAccount = async (googleAccountId: string) => {
	return handleAction(async () => {
		try {
			const { gmail, googleAccount, markConnected } =
				await gmailClientForGoogleAccount(googleAccountId);

			const profile = await gmail.users.getProfile({ userId: "me" });

			await markConnected();

			return {
				success: true,
				message: "Google account connected",
				data: {
					ok: true,
					status: "connected",
					message: "Google account connected",
					meta: {
						email: profile.data.emailAddress ?? googleAccount.email,
						historyId: profile.data.historyId ?? null,
						messagesTotal: profile.data.messagesTotal ?? null,
						threadsTotal: profile.data.threadsTotal ?? null,
					},
				} as VerifyResult & { status: "connected" },
			};
		} catch (err: any) {
			const message = err?.message ?? "Google verification failed";

			return {
				success: false,
				error: message,
				data: {
					ok: false,
					status: "revoked",
					message,
					meta: {
						code: err?.code,
						status: err?.status,
					},
				} as VerifyResult & { status: "revoked" },
			};
		}
	});
};


export async function createInboundIdentity(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const data = decode(formData);

		const label = String(data.label || "").trim();

		if (!label) {
			return {
				success: false,
				error: "Identity label is required",
			};
		}

		const slug = slugify(label);

		if (!slug) {
			return {
				success: false,
				error: "Invalid identity label",
			};
		}

		const value = `${slug}@inbound.kurrier`;

		const workspaceId = await getWorkspaceId();
		const user = await isSignedIn();
		const userId = String(user?.id || "");

		if (!userId) {
			return {
				success: false,
				error: "Not signed in",
			};
		}

		const rls = await rlsClient();

		const [inboundProvider] = await rls((tx) =>
			tx
				.select()
				.from(providers)
				.where(
					and(
						eq(providers.workspaceId, workspaceId),
						eq(providers.ownerId, userId),
						eq(providers.type, "inbound"),
					),
				)
				.limit(1),
		);

		if (!inboundProvider) {
			return {
				success: false,
				error: "Kurrier Inbound provider is not initialized",
			};
		}

		const [existingIdentity] = await rls((tx) =>
			tx
				.select({ id: identities.id })
				.from(identities)
				.where(
					and(
						eq(identities.workspaceId, workspaceId),
						eq(identities.kind, "email"),
						eq(identities.value, value),
					),
				)
				.limit(1),
		);

		if (existingIdentity) {
			return {
				success: false,
				error: `Inbound identity ${value} already exists`,
			};
		}

		const identityData = IdentityInsertSchema.parse({
			workspaceId,
			ownerId: userId,
			kind: "email",
			value,
			displayName: label,
			providerId: inboundProvider.id,
			status: "verified",
			sharedWithWorkspace: true,
			metaData: {
				provider: "inbound",
			},
		});

		const [identity] = await rls((tx) =>
			tx
				.insert(identities)
				.values(identityData as IdentityCreate)
				.returning(),
		);
		await assignIdentityToAllWorkspaceMembers(identity);
		await initializeMailboxes(identity, userId, workspaceId);

		revalidatePath(DASHBOARD_PATH);
		return {
			success: true,
			message: `Created ${value}`,
		};
	});
}


export const fetchInboundIdentities = async () => {

	const rls = await rlsClient();
	return rls((tx) =>
		tx
			.select({
				identity: identities,
				provider: providers,
			})
			.from(identities)
			.innerJoin(providers, eq(identities.providerId, providers.id))
			.where(
				and(
					eq(identities.kind, "email"),
					eq(providers.type, "inbound"),
				),
			)
			.orderBy(desc(identities.createdAt)),
	);

};

export type FetchInboundIdentitiesResult = Awaited<ReturnType<typeof fetchInboundIdentities>>;
export type FetchInboundIdentitiesResultRow = FetchInboundIdentitiesResult[number];


export const deleteInboundIdentity = async (
	identityId: string,
): Promise<FormState> => {
	return handleAction(async () => {
		const rls = await rlsClient();
		const workspaceId = await getWorkspaceId();

		const [identity] = await rls((tx) =>
			tx
				.select({
					identity: identities,
					provider: providers,
				})
				.from(identities)
				.innerJoin(providers, eq(identities.providerId, providers.id))
				.where(
					and(
						eq(identities.id, identityId),
						eq(providers.type, "inbound"),
					),
				)
				.limit(1),
		);

		if (!identity) {
			return {
				success: false,
				error: "Inbound identity not found",
			};
		}

		await enqueueIdentityCleanup(
			identity.identity.id,
			workspaceId,
		);

		await rls((tx) =>
			tx
				.delete(identities)
				.where(eq(identities.id, identity.identity.id)),
		);

		revalidatePath(DASHBOARD_PATH);
		revalidatePath("/w/[workspaceId]/dashboard/platform/identities");

		return {
			success: true,
			message: "Inbound identity deleted",
		};
	});
};


export type GoogleOAuthConfig = {
	clientId: string;
	clientSecret: string;
};

const GOOGLE_MAIL_OAUTH_SECRET_NAME = "GOOGLE_MAIL_OAUTH_CONFIG";

export async function fetchGoogleOAuthConfig(): Promise<GoogleOAuthConfig | null> {
	const rls = await rlsClient();
	const session = await currentSession();
	const workspaceId = await getWorkspaceId();

	const [row] = await rls((tx) =>
		tx
			.select({
				id: secretsMeta.id,
			})
			.from(secretsMeta)
			.where(
				and(
					eq(secretsMeta.workspaceId, workspaceId),
					eq(secretsMeta.name, GOOGLE_MAIL_OAUTH_SECRET_NAME),
					eq(secretsMeta.managedBy, "user"),
				),
			)
			.limit(1),
	);

	if (!row) return null;

	const { vault } = await getSecret(session, row.id, workspaceId);

	if (!vault?.decrypted_secret) return null;

	try {
		const parsed = JSON.parse(vault.decrypted_secret);

		if (!parsed?.clientId || !parsed?.clientSecret) {
			return null;
		}

		return {
			clientId: String(parsed.clientId),
			clientSecret: String(parsed.clientSecret),
		};
	} catch {
		return null;
	}
}

export async function hasGoogleOAuthConfig(): Promise<boolean> {
	const config = await fetchGoogleOAuthConfig();

	if (config) {
		return true;
	}

	return Boolean(
		process.env.GOOGLE_MAIL_CLIENT_ID &&
		process.env.GOOGLE_MAIL_CLIENT_SECRET,
	);
}

export async function saveGoogleOAuthConfig(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const data = decode(formData);

		const clientId = String(data.clientId ?? "").trim();
		const clientSecret = String(data.clientSecret ?? "").trim();

		if (!clientId || !clientSecret) {
			return {
				success: false,
				error: "Google Client ID and Client Secret are required.",
			};
		}

		const session = await currentSession();
		const workspaceId = await getWorkspaceId();
		const rls = await rlsClient();

		const [existing] = await rls((tx) =>
			tx
				.select()
				.from(secretsMeta)
				.where(
					and(
						eq(secretsMeta.workspaceId, workspaceId),
						eq(secretsMeta.name, GOOGLE_MAIL_OAUTH_SECRET_NAME),
						eq(secretsMeta.managedBy, "user"),
					),
				)
				.limit(1),
		);

		const value = JSON.stringify({
			clientId,
			clientSecret,
		});

		if (existing) {
			await updateSecret(session, workspaceId, existing.id, {
				value,
				description: "Google Mail OAuth credentials"
			});
		} else {
			await createSecret(session, workspaceId, {
				name: GOOGLE_MAIL_OAUTH_SECRET_NAME,
				value,
				description: "Google Mail OAuth credentials",
				managedBy: "user",
			});
		}

		revalidatePath(DASHBOARD_PATH);

		return {
			success: true,
			message: "Google Mail OAuth configuration saved."
		};
	});
}
