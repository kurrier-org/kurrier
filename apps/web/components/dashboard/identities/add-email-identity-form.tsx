"use client";

import { imapQuotaList } from "@schema";
import React, { useEffect } from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	addNewEmailIdentity,
	type FetchDecryptedSecretsResult,
	type FetchGoogleAccountsResult,
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
	userDomainIdentities,
	userEmailIdentities,
}: {
	onCompleted?: () => void;
	providerOptions: { label: string; value: string }[];
	smtpAccounts: FetchDecryptedSecretsResult;
	providerAccounts: FetchDecryptedSecretsResult;
	googleAccounts: FetchGoogleAccountsResult;
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
	const [activeId, setActiveId] = React.useState<string | null>(null);

	const [googleAccount, setGoogleAccount] = React.useState<
		FetchGoogleAccountsResult[number] | null
	>(null);

	const [rawProvider, setRawProvider] = React.useState<string | null>(null);

	const [localPart, setLocalPart] = React.useState("");
	const [subdomain, setSubdomain] = React.useState("");
	const [domainId, setDomainId] = React.useState<string | null>(null);

	const chosenDomain = userDomainIdentities.find(
		(d) => String(d.identities.id) === domainId,
	);

	const composedEmail = React.useMemo(() => {
		if (!localPart || !chosenDomain) return "";
		const domain = chosenDomain.identities.value;
		return `${localPart}@${domain}`;
	}, [localPart, chosenDomain]);

	const mustBeShared = userEmailIdentities.length === 0;
	const [sharedWithWorkspace, setSharedWithWorkspace] =
		React.useState<boolean>(mustBeShared);
	useEffect(() => {
		setSharedWithWorkspace(mustBeShared);
	}, [mustBeShared]);

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
					<span className={"text-xs"}>
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
					dict?.platform?.dailyImapQuotaSuffix ?? "(Default: 500 MB per day)",
				kind: "select" as const,
				defaultValue: "500",
				options: imapQuotaList.map((quota) => {
					return {
						label: quota.label,
						value: String(quota.value),
					};
				}),
				wrapperClasses: "col-span-12",
				props: {
					className: "w-full",
				},
			},
			{
				name: "smtpAccountId",
				wrapperClasses: "hidden",
				props: { hidden: true, defaultValue: smtpAccount?.linkRow.accountId },
			},
			{
				name: "kind",
				wrapperClasses: "hidden",
				props: { hidden: true, defaultValue: "email" },
			},
		];
	}

	function getNonSmtpFields() {
		return [
			{
				name: "domain",
				label:
					dict?.platform?.chooseAVerifiedDomain ?? "Choose a verified domain",
				kind: "select" as const,
				options: userDomainIdentities
					?.filter((userDomainIdentity) => {
						return (
							userDomainIdentity?.providers?.id === provider?.linkRow.providerId
						);
					})
					.map((d) => ({
						label: d.identities.value,
						value: String(d.identities.id),
					})),
				wrapperClasses: "col-span-12",
				props: {
					required: true,
					className: "w-full",
					onChange: (val: unknown) => {
						const v =
							typeof val === "string"
								? val
								: ((val as any)?.target?.value ?? "");
						setDomainId(v);
					},
				},
			},
			{
				name: "displayName",
				label: dict?.platform?.displayName ?? "Display Name",
				required: true,
				wrapperClasses: "col-span-12",
				bottomStartPrefix: (
					<span className={"text-xs"}>
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
					placeholder: dict?.platform?.localPartPlaceholder ?? "e.g. support",
					required: true,
					onInput: (e: any) => setLocalPart(e.target.value),
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
				props: { hidden: true, value: composedEmail, readOnly: true },
			},
			{
				name: "providerId",
				wrapperClasses: "hidden",
				props: { hidden: true, defaultValue: provider?.linkRow.providerId },
			},
			{
				name: "kind",
				wrapperClasses: "hidden",
				props: { hidden: true, defaultValue: "email" },
			},
		] as const;
	}

	function getGoogleFields() {
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
					defaultValue: googleAccount?.email || "",
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
					defaultValue: googleAccount?.name || "",
				},
			},
			{
				name: "googleAccountId",
				wrapperClasses: "hidden",
				props: {
					hidden: true,
					defaultValue: googleAccount?.id,
				},
			},
			{
				name: "dailyQuota",
				label:
					dict?.platform?.dailyImapQuota ??
					"Daily IMAP quota (Used for backfilling older mails)",
				labelSuffix:
					dict?.platform?.dailyImapQuotaSuffix ?? "(Default: 500 MB per day)",
				kind: "select" as const,
				defaultValue: "500",
				options: imapQuotaList.map((quota) => {
					return {
						label: quota.label,
						value: String(quota.value),
					};
				}),
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
		} else if (googleAccount?.id === activeId) {
			return getGoogleFields();
		} else if (provider?.linkRow.providerId === activeId) {
			return getNonSmtpFields();
		} else {
			return [];
		}
	}, [
		provider,
		smtpAccount,
		activeId,
		localPart,
		subdomain,
		domainId,
		googleAccount,
	]);

	const fields = [
		{
			name: "provider",
			label:
				dict?.platform?.chooseAVerifiedProvider ?? "Choose a verified provider",
			kind: "select" as const,
			options: providerOptions,
			wrapperClasses: "col-span-12",
			props: {
				defaultValue: rawProvider || undefined,
				className: "w-full",
				required: true,
				onChange: (val: unknown) => {
					setRawProvider(String(val));
					const v =
						typeof val === "string" ? val : ((val as any)?.target?.value ?? "");
					const id = v?.replace(/^[a-z]+-/, "") || null;
					const foundGoogleAccount =
						googleAccounts.find((g) => String(g.id) === id) ?? null;

					if (foundGoogleAccount) {
						setGoogleAccount(foundGoogleAccount);
						setProvider(null);
						setSmtpAccount(null);
						setActiveId(String(foundGoogleAccount.id));
						return;
					}
					const foundProvider =
						providerAccounts.find((s) => String(s.linkRow.id) === id) ?? null;
					const foundSmtpAccount =
						smtpAccounts.find((s) => String(s.linkRow.id) === id) ?? null;
					if (foundProvider) {
						setProvider(foundProvider);
						setSmtpAccount(null);
						setGoogleAccount(null);
						setActiveId(String(foundProvider.linkRow.providerId));
						return;
					} else if (foundSmtpAccount) {
						setSmtpAccount(foundSmtpAccount);
						setProvider(null);
						setGoogleAccount(null);
						setActiveId(String(foundSmtpAccount.linkRow.accountId));
						return;
					}
				},
			},
		},
		...extraFields,
		{
			el: (
				<>
					{composedEmail && provider?.linkRow.providerId === activeId && (
						<div className="mt-3 p-3 border rounded-md bg-muted text-sm text-muted-foreground text-center">
							{dict?.platform?.previewColon ?? "Preview:"}
							<span className="mx-2 font-medium text-foreground">
								{composedEmail}{" "}
							</span>
						</div>
					)}
				</>
			),
		},
	];

	const finalizeEmail = async () => {
		if (onCompleted) onCompleted();
	};

	return (
		<div>
			<ReusableForm
				action={addNewEmailIdentity}
				onSuccess={finalizeEmail}
				fields={fields}
				formKey={String(activeId)}
			/>
		</div>
	);
}

export default AddEmailIdentityForm;
