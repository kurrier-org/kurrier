"use client";

import type { CustomEmailProvider, FieldConfig } from "@schema";
import { ulid } from "ulid";
import { ReusableForm } from "@/components/common/reusable-form";
import { createCustomProviderSMTPAccount } from "@/lib/actions/dashboard";

export default function NewCustomEmailProviderAccountForm({
	provider,
	onCompleted,
}: {
	provider: CustomEmailProvider;
	onCompleted?: () => void;
}) {
	const fields: FieldConfig[] = [
		{
			name: "ulid",
			props: { type: "hidden", defaultValue: ulid() },
		},
		{
			name: "presetId",
			props: { type: "hidden", defaultValue: provider.id },
		},
		{
			name: "credentialMode",
			props: { type: "hidden", defaultValue: provider.credentialMode },
		},
	];

	if (provider.credentialMode === "shared") {
		fields.push(
			{
				name: "username",
				label: "Mailbox email",
				props: {
					type: "email",
					autoComplete: "username",
					required: true,
					placeholder: "you@example.com",
				},
				bottomStartPrefix: (
					<span className="text-xs text-muted-foreground">
						{provider.imap
							? "Used as the username for both SMTP and IMAP."
							: "Used as the SMTP username."}
					</span>
				),
			},
			{
				name: "password",
				label: "Mailbox password",
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
				label: "SMTP mailbox email",
				props: {
					type: "email",
					autoComplete: "username",
					required: true,
					placeholder: "you@example.com",
				},
			},
			{
				name: "smtpPassword",
				label: "SMTP password",
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
							<p className="text-sm font-medium">Incoming mail</p>
							<p className="mt-1 text-xs text-muted-foreground">
								This provider uses separate IMAP credentials.
							</p>
						</div>
					),
				},
				{
					name: "imapUsername",
					label: "IMAP username",
					props: {
						autoComplete: "username",
						required: true,
					},
				},
				{
					name: "imapPassword",
					label: "IMAP password",
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
				submitLabel: "Add account",
				wrapperClasses: "mt-6",
				fullWidth: true,
			}}
		/>
	);
}
