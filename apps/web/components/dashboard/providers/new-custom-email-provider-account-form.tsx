"use client";

import type { CustomEmailProvider, FieldConfig } from "@schema";
import { ulid } from "ulid";
import { ReusableForm } from "@/components/common/reusable-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { createCustomProviderSMTPAccount } from "@/lib/actions/dashboard";

export default function NewCustomEmailProviderAccountForm({
	provider,
	onCompleted,
}: {
	provider: CustomEmailProvider;
	onCompleted?: () => void;
}) {
	const dict = useOptionalDictionary();
	const fields: FieldConfig[] = [
		{
			name: "ulid",
			props: { type: "hidden", defaultValue: ulid() },
			wrapperClasses: "hidden",
		},
		{
			name: "presetId",
			props: { type: "hidden", defaultValue: provider.id },
			wrapperClasses: "hidden",
		},
		{
			name: "credentialMode",
			props: { type: "hidden", defaultValue: provider.credentialMode },
			wrapperClasses: "hidden",
		},
	];

	if (provider.credentialMode === "shared") {
		fields.push(
			{
				name: "username",
				label: dict?.platform?.mailboxEmail ?? "Mailbox email",
				props: {
					type: "email",
					autoComplete: "username",
					required: true,
					placeholder: "you@example.com",
				},
				bottomStartPrefix: (
					<span className="text-xs text-muted-foreground">
						{provider.imap
							? (dict?.platform?.mailboxEmailUsedForBothHelp ??
								"Used as the username for both SMTP and IMAP.")
							: (dict?.platform?.mailboxEmailUsedForSmtpHelp ??
								"Used as the SMTP username.")}
					</span>
				),
			},
			{
				name: "password",
				label: dict?.platform?.mailboxPassword ?? "Mailbox password",
				props: {
					type: "password",
					autoComplete: "current-password",
					required: true,
				},
			},
		);
	} else {
		fields.push(
			{
				name: "smtpUsername",
				label:
					dict?.platform?.customProviderSmtpUsername ?? "SMTP mailbox email",
				props: {
					type: "email",
					autoComplete: "username",
					required: true,
					placeholder: "you@example.com",
				},
			},
			{
				name: "smtpPassword",
				label: dict?.platform?.customProviderSmtpPassword ?? "SMTP password",
				props: {
					type: "password",
					autoComplete: "current-password",
					required: true,
				},
			},
		);

		if (provider.imap) {
			fields.push(
				{
					el: (
						<div className="border-t pt-4">
							<p className="text-sm font-medium">
								{dict?.platform?.customProviderIncomingMailTitle ??
									"Incoming mail"}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{dict?.platform?.customProviderSeparateImapHelp ??
									"This provider uses separate IMAP credentials."}
							</p>
						</div>
					),
				},
				{
					name: "imapUsername",
					label: dict?.platform?.customProviderImapUsername ?? "IMAP username",
					props: {
						autoComplete: "username",
						required: true,
					},
				},
				{
					name: "imapPassword",
					label: dict?.platform?.customProviderImapPassword ?? "IMAP password",
					props: {
						type: "password",
						autoComplete: "current-password",
						required: true,
					},
				},
			);
		}
	}

	return (
		<ReusableForm
			action={createCustomProviderSMTPAccount}
			onSuccess={onCompleted}
			fields={fields}
			submitButtonProps={{
				submitLabel: dict?.platform?.addAccount ?? "Add account",
				wrapperClasses: "mt-6",
				fullWidth: true,
			}}
		/>
	);
}
