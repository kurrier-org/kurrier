import {
	addNewDomainIdentity,
	FetchDecryptedSecretsResult,
} from "@/lib/actions/dashboard";
import { ReusableForm } from "@/components/common/reusable-form";
import React from "react";
import { FormState } from "@schema";

function AddDomainIdentityForm({
	onCompleted,
	providerOptions,
	providerAccounts,
}: {
	onCompleted?: (res: FormState) => void;
	providerOptions: { label: string; value: string }[];
	providerAccounts: FetchDecryptedSecretsResult;
}) {
	const [provider, setProvider] = React.useState<
		FetchDecryptedSecretsResult[number] | null
	>(null);

	const fields = [
		{
			name: "providerOption",
			label: "Choose a verified provider",
			kind: "select" as const,
			options: providerOptions.filter((po) => !po.value.startsWith("smtp")),
			wrapperClasses: "col-span-12",
			props: {
				className: "w-full",
				required: true,
				onChange: (val: unknown) => {
					const v =
						typeof val === "string" ? val : ((val as any)?.target?.value ?? "");
					const id = v?.replace(/^[a-z]+-/, "") || null;
					const found =
						providerAccounts.find((s) => String(s.linkRow.id) === id) ?? null;
					setProvider(found);
				},
			},
		},

		{
			name: "value",
			label: "Domain name",
			required: true,
			wrapperClasses: "col-span-12",
			props: {
				autoComplete: "off",
				required: true,
				placeholder: "e.g. example.com",
			},
		},
		{
			name: "providerId",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: provider?.linkRow.providerId },
		},
		{
			name: "kind",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: "domain" },
		},
		{
			name: "incomingDomain",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: "true" },
		},
		...(provider?.provider?.type === "ses"
			? [
					{
						name: "mailFromSubdomain",
						label: "MAIL FROM subdomain (optional for SPF/DMARC alignment)",
						wrapperClasses: "col-span-12",
						props: {
							autoComplete: "off",
							placeholder: "e.g. mail.example.com",
							title: "Enter a subdomain like mail.example.com",
						},
						bottomStartPrefix: (
							<p className="text-xs text-muted-foreground">
								Improves SPF and DMARC alignment by ensuring your messages
								appear to come directly from your domain, which helps reduce the
								chance of emails being flagged as spam.
							</p>
						),
					},
				]
			: []),
	];

	return (
		<ReusableForm
			action={addNewDomainIdentity}
			onSuccess={onCompleted || undefined}
			fields={fields}
		/>
	);
}

export default AddDomainIdentityForm;
