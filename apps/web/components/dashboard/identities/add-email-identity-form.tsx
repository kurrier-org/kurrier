import {
	addNewEmailIdentity,
	FetchDecryptedSecretsResult,
	FetchUserIdentitiesResult,
} from "@/lib/actions/dashboard";
import { ReusableForm } from "@/components/common/reusable-form";
import React from "react";
import { parseSecret } from "@/lib/utils";

function AddEmailIdentityForm({
	onCompleted,
	providerOptions,
	smtpAccounts,
	providerAccounts,
	userDomainIdentities,
}: {
	onCompleted?: () => void;
	providerOptions: { label: string; value: string }[];
	smtpAccounts: FetchDecryptedSecretsResult;
	providerAccounts: FetchDecryptedSecretsResult;
	userDomainIdentities: FetchUserIdentitiesResult;
}) {
	const [provider, setProvider] = React.useState<
		FetchDecryptedSecretsResult[number] | null
	>(null);
	const [smtpAccount, setSmtpAccount] = React.useState<
		FetchDecryptedSecretsResult[number] | null
	>(null);
	const [activeId, setActiveId] = React.useState<string | null>(null);

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

	function getSmtpFields() {
		const parsedVaultValues = parseSecret(smtpAccount);
		return [
			{
				name: "value",
				label: "Email address",
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
				label: "Choose a verified domain",
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
				name: "local",
				label: "Local part",
				wrapperClasses: "col-span-12",
				props: {
					defaultValue: localPart,
					autoComplete: "off",
					placeholder: "e.g. support",
					required: true,
					onInput: (e: any) => setLocalPart(e.target.value),
				},
				bottomStartPrefix: (
					<p className="text-xs text-muted-foreground">
						The part before the “@”. Example: <code>support</code> → support@…
					</p>
				),
			},

			// hidden computed email value
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

	const extraFields = React.useMemo(() => {
		if (smtpAccount?.linkRow.accountId === activeId) {
			return getSmtpFields();
		} else if (provider?.linkRow.providerId === activeId) {
			return getNonSmtpFields();
		} else {
			return [];
		}
	}, [provider, smtpAccount, activeId, localPart, subdomain, domainId]);

	const fields = [
		{
			name: "provider",
			label: "Choose a verified provider",
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
					const foundProvider =
						providerAccounts.find((s) => String(s.linkRow.id) === id) ?? null;
					const foundSmtpAccount =
						smtpAccounts.find((s) => String(s.linkRow.id) === id) ?? null;
					if (foundProvider) {
						setProvider(foundProvider);
						setActiveId(String(foundProvider.linkRow.providerId));
					} else if (foundSmtpAccount) {
						setSmtpAccount(foundSmtpAccount);
						setActiveId(String(foundSmtpAccount.linkRow.accountId));
					}
				},
			},
		},
		...extraFields,
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

			{composedEmail && provider?.linkRow.providerId === activeId && (
				<div className="mt-3 p-3 border rounded-md bg-muted text-sm text-muted-foreground text-center">
					Preview:
					<span className="mx-2 font-medium text-foreground">
						{composedEmail}{" "}
					</span>
				</div>
			)}
		</div>
	);
}

export default AddEmailIdentityForm;
