"use client";

import { imapQuotaList } from "@schema";
import React, { useEffect } from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	addNewEmailIdentity,
	type FetchDecryptedSecretsResult,
	type FetchGoogleAccountsResult,
	type FetchMicrosoftAccountsResult,
	type FetchUserIdentitiesResult,
} from "@/lib/actions/dashboard";
import type { FetchWorkspaceMembersResult } from "@/lib/actions/workspace";
import { parseSecret } from "@/lib/utils";

function AddEmailIdentityForm({
								  onCompleted,
								  providerOptions,
								  smtpAccounts,
								  providerAccounts,
								  googleAccounts,
								  microsoftAccounts,
								  userDomainIdentities,
								  userEmailIdentities,
							  }: {
	onCompleted?: () => void;
	providerOptions: { label: string; value: string }[];
	smtpAccounts: FetchDecryptedSecretsResult;
	providerAccounts: FetchDecryptedSecretsResult;
	googleAccounts: FetchGoogleAccountsResult;
	microsoftAccounts: FetchMicrosoftAccountsResult;
	workspaceMembers: FetchWorkspaceMembersResult;
	userDomainIdentities: FetchUserIdentitiesResult;
	userEmailIdentities: FetchUserIdentitiesResult;
}) {
	const dict = useOptionalDictionary();

	const [provider, setProvider] = React.useState<
		FetchDecryptedSecretsResult[number] | null
	>(null);

	const [smtpAccount, setSmtpAccount] = React.useState<
		FetchDecryptedSecretsResult[number] | null
	>(null);

	const [googleAccount, setGoogleAccount] = React.useState<
		FetchGoogleAccountsResult[number] | null
	>(null);

	const [microsoftAccount, setMicrosoftAccount] = React.useState<
		FetchMicrosoftAccountsResult[number] | null
	>(null);

	const [activeId, setActiveId] = React.useState<string | null>(null);
	const [rawProvider, setRawProvider] = React.useState<string | null>(null);

	const [localPart, setLocalPart] = React.useState("");
	const [domainId, setDomainId] = React.useState<string | null>(null);

	const chosenDomain = userDomainIdentities.find(
		(d) => String(d.identities.id) === domainId,
	);

	const composedEmail = React.useMemo(() => {
		if (!localPart || !chosenDomain) return "";
		return `${localPart}@${chosenDomain.identities.value}`;
	}, [localPart, chosenDomain]);

	const mustBeShared = userEmailIdentities.length === 0;

	const [sharedWithWorkspace, setSharedWithWorkspace] =
		React.useState<boolean>(mustBeShared);

	useEffect(() => {
		setSharedWithWorkspace(mustBeShared);
	}, [mustBeShared]);

	const availableProviderOptions = React.useMemo(() => {
		const existingEmails = new Set(
			userEmailIdentities.map((identity) =>
				identity.identities.value.toLowerCase(),
			),
		);

		const usedGoogleAccountIds = new Set(
			userEmailIdentities
				.map((identity) => {
					const metaData = identity.identities.metaData as
						| { gmail?: { googleAccountId?: string } }
						| null
						| undefined;

					return metaData?.gmail?.googleAccountId;
				})
				.filter((id): id is string => Boolean(id)),
		);

		const usedMicrosoftAccountIds = new Set(
			userEmailIdentities
				.map((identity) => {
					const metaData = identity.identities.metaData as
						| { microsoft?: { microsoftAccountId?: string } }
						| null
						| undefined;

					return metaData?.microsoft?.microsoftAccountId;
				})
				.filter((id): id is string => Boolean(id)),
		);

		const seenSmtpEmails = new Set<string>();
		const seenOptions = new Set<string>();

		return providerOptions.filter((option) => {
			const optionId = option.value.replace(/^[a-z]+-/, "");

			if (option.value.startsWith("smtp-")) {
				const account = smtpAccounts.find(
					(item) => String(item.linkRow.id) === optionId,
				);

				if (!account) return false;

				const secret = parseSecret(account);
				const email = String(secret.SMTP_USERNAME ?? "")
					.trim()
					.toLowerCase();

				if (!email || existingEmails.has(email) || seenSmtpEmails.has(email)) {
					return false;
				}

				seenSmtpEmails.add(email);
				return true;
			}

			if (option.value.startsWith("google-")) {
				return !usedGoogleAccountIds.has(optionId);
			}

			if (option.value.startsWith("microsoft-")) {
				return !usedMicrosoftAccountIds.has(optionId);
			}

			if (seenOptions.has(option.value)) return false;

			seenOptions.add(option.value);
			return true;
		});
	}, [providerOptions, smtpAccounts, userEmailIdentities]);

	function getSmtpFields() {
		const parsedVaultValues = parseSecret(smtpAccount);

		return [
			{
				name: "value",
				label: dict?.platform?.emailAddress ?? "Email address",
				required: true,
				wrapperClasses: "col-span-12",
				props: {
					autoComplete: "off",
					required: true,
					readOnly: true,
					defaultValue: parsedVaultValues.SMTP_USERNAME || "",
				},
			},
			{
				name: "displayName",
				label: dict?.platform?.displayName ?? "Display Name",
				required: true,
				wrapperClasses: "col-span-12",
				bottomStartPrefix: (
					<span className="text-xs">
						{dict?.platform?.displayNameHelp ??
							"This name will appear as the organizer when you create calendar events or send invitations."}
					</span>
				),
				props: {
					autoComplete: "off",
					required: true,
				},
			},
			{
				name: "dailyQuota",
				label:
					dict?.platform?.dailyImapQuota ??
					"Daily IMAP quota (Used for backfilling older mails)",
				labelSuffix:
					dict?.platform?.dailyImapQuotaSuffix ??
					"(Default: 500 MB per day)",
				kind: "select" as const,
				defaultValue: "500",
				options: imapQuotaList.map((quota) => ({
					label: quota.label,
					value: String(quota.value),
				})),
				wrapperClasses: "col-span-12",
				props: {
					className: "w-full",
				},
			},
			{
				name: "smtpAccountId",
				wrapperClasses: "hidden",
				props: {
					hidden: true,
					defaultValue: smtpAccount?.linkRow.accountId,
				},
			},
			{
				name: "kind",
				wrapperClasses: "hidden",
				props: {
					hidden: true,
					defaultValue: "email",
				},
			},
		];
	}

	function getNonSmtpFields() {
		return [
			{
				name: "domain",
				label:
					dict?.platform?.chooseAVerifiedDomain ??
					"Choose a verified domain",
				kind: "select" as const,
				options: userDomainIdentities
					.filter(
						(identity) =>
							identity.providers?.id === provider?.linkRow.providerId,
					)
					.map((identity) => ({
						label: identity.identities.value,
						value: String(identity.identities.id),
					})),
				wrapperClasses: "col-span-12",
				props: {
					required: true,
					className: "w-full",
					onChange: (val: unknown) => {
						const value =
							typeof val === "string"
								? val
								: ((val as any)?.target?.value ?? "");

						setDomainId(value);
					},
				},
			},
			{
				name: "displayName",
				label: dict?.platform?.displayName ?? "Display Name",
				required: true,
				wrapperClasses: "col-span-12",
				bottomStartPrefix: (
					<span className="text-xs">
						{dict?.platform?.displayNameHelp ??
							"This name will appear as the organizer when you create calendar events or send invitations."}
					</span>
				),
				props: {
					autoComplete: "off",
					required: true,
				},
			},
			{
				name: "local",
				label: dict?.platform?.localPart ?? "Local part",
				wrapperClasses: "col-span-12",
				props: {
					defaultValue: localPart,
					autoComplete: "off",
					placeholder:
						dict?.platform?.localPartPlaceholder ?? "e.g. support",
					required: true,
					onInput: (e: React.FormEvent<HTMLInputElement>) =>
						setLocalPart(e.currentTarget.value),
				},
				bottomStartPrefix: (
					<p className="text-xs text-muted-foreground">
						{dict?.platform?.localPartHelpPrefix ??
							"The part before the “@”. Example: "}
						<code>support</code>
						{dict?.platform?.localPartHelpSuffix ?? " → support@…"}
					</p>
				),
			},
			{
				name: "value",
				wrapperClasses: "hidden",
				props: {
					hidden: true,
					value: composedEmail,
					readOnly: true,
				},
			},
			{
				name: "providerId",
				wrapperClasses: "hidden",
				props: {
					hidden: true,
					defaultValue: provider?.linkRow.providerId,
				},
			},
			{
				name: "kind",
				wrapperClasses: "hidden",
				props: {
					hidden: true,
					defaultValue: "email",
				},
			},
		] as const;
	}

	function getOAuthFields() {
		const account = googleAccount ?? microsoftAccount;

		return [
			{
				name: "value",
				label: dict?.platform?.emailAddress ?? "Email address",
				required: true,
				wrapperClasses: "col-span-12",
				props: {
					autoComplete: "off",
					required: true,
					readOnly: true,
					defaultValue: account?.email || "",
				},
			},
			{
				name: "displayName",
				label: dict?.platform?.displayName ?? "Display Name",
				required: true,
				wrapperClasses: "col-span-12",
				props: {
					autoComplete: "off",
					required: true,
					defaultValue: account?.name || "",
				},
			},
			{
				name: googleAccount ? "googleAccountId" : "microsoftAccountId",
				wrapperClasses: "hidden",
				props: {
					hidden: true,
					defaultValue: account?.id,
				},
			},
			{
				name: "dailyQuota",
				label:
					dict?.platform?.dailyImapQuota ??
					"Daily IMAP quota (Used for backfilling older mails)",
				labelSuffix:
					dict?.platform?.dailyImapQuotaSuffix ??
					"(Default: 500 MB per day)",
				kind: "select" as const,
				defaultValue: "500",
				options: imapQuotaList.map((quota) => ({
					label: quota.label,
					value: String(quota.value),
				})),
				wrapperClasses: "col-span-12",
				props: {
					className: "w-full",
				},
			},
			{
				name: "kind",
				wrapperClasses: "hidden",
				props: {
					hidden: true,
					defaultValue: "email",
				},
			},
		];
	}

	const extraFields = React.useMemo(() => {
		if (smtpAccount?.linkRow.accountId === activeId) {
			return getSmtpFields();
		}

		if (
			googleAccount?.id === activeId ||
			microsoftAccount?.id === activeId
		) {
			return getOAuthFields();
		}

		if (provider?.linkRow.providerId === activeId) {
			return getNonSmtpFields();
		}

		return [];
	}, [
		provider,
		smtpAccount,
		googleAccount,
		microsoftAccount,
		activeId,
		localPart,
		domainId,
	]);

	const fields = [
		{
			name: "provider",
			label:
				dict?.platform?.chooseAVerifiedProvider ??
				"Choose a verified provider",
			kind: "select" as const,
			options: availableProviderOptions,
			wrapperClasses: "col-span-12",
			props: {
				defaultValue: rawProvider || undefined,
				className: "w-full",
				required: true,
				onChange: (val: unknown) => {
					const value =
						typeof val === "string"
							? val
							: ((val as any)?.target?.value ?? "");

					setRawProvider(value);

					const id = value.replace(/^[a-z]+-/, "");

					setProvider(null);
					setSmtpAccount(null);
					setGoogleAccount(null);
					setMicrosoftAccount(null);
					setActiveId(null);

					if (value.startsWith("google-")) {
						const account = googleAccounts.find(
							(item) => String(item.id) === id,
						);

						if (account) {
							setGoogleAccount(account);
							setActiveId(String(account.id));
						}

						return;
					}

					if (value.startsWith("microsoft-")) {
						const account = microsoftAccounts.find(
							(item) => String(item.id) === id,
						);

						if (account) {
							setMicrosoftAccount(account);
							setActiveId(String(account.id));
						}

						return;
					}

					if (value.startsWith("provider-")) {
						const account = providerAccounts.find(
							(item) => String(item.linkRow.id) === id,
						);

						if (account) {
							setProvider(account);
							setActiveId(String(account.linkRow.providerId));
						}

						return;
					}

					if (value.startsWith("smtp-")) {
						const account = smtpAccounts.find(
							(item) => String(item.linkRow.id) === id,
						);

						if (account) {
							setSmtpAccount(account);
							setActiveId(String(account.linkRow.accountId));
						}
					}
				},
			},
		},
		...extraFields,
		{
			el: (
				<>
					{composedEmail &&
						provider?.linkRow.providerId === activeId && (
							<div className="mt-3 rounded-md border bg-muted p-3 text-center text-sm text-muted-foreground">
								{dict?.platform?.previewColon ?? "Preview:"}
								<span className="mx-2 font-medium text-foreground">
									{composedEmail}
								</span>
							</div>
						)}
				</>
			),
		},
	];

	return (
		<div>
			<ReusableForm
				action={addNewEmailIdentity}
				onSuccess={() => onCompleted?.()}
				fields={fields}
				formKey={String(activeId)}
			/>
		</div>
	);
}

export default AddEmailIdentityForm;
