"use client";

import {
	type CustomEmailProvider,
	defaultImapQuota,
	type FieldConfig,
	imapQuotaList,
} from "@schema";
import { ulid } from "ulid";
import { ReusableForm } from "@/components/common/reusable-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { connectCustomEmailProvider } from "@/lib/actions/dashboard";

export default function NewCustomEmailProviderAccountForm({
	provider,
	onCompleted,
}: {
	provider: CustomEmailProvider;
	onCompleted?: (data?: {
		identityPublicId?: string;
		mailboxSlug?: string;
	}) => void;
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

	if (provider.imap) {
		fields.push(
			{
				el: (
					<div className="border-t pt-4">
						<p className="text-sm font-medium">
							{dict?.platform?.customProviderMailboxIdentityTitle ??
								"Mailbox identity"}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							{dict?.platform?.customProviderMailboxIdentityHelp ??
								"Kurrier will create the email identity and start syncing its mailboxes automatically."}
						</p>
					</div>
				),
			},
			{
				name: "displayName",
				label: dict?.platform?.displayName ?? "Display name",
				props: {
					autoComplete: "name",
					required: true,
					placeholder:
						dict?.platform?.customProviderDisplayNamePlaceholder ?? "Your name",
				},
				bottomStartPrefix: (
					<span className="text-xs text-muted-foreground">
						{dict?.platform?.customProviderDisplayNameHelp ??
							"Shown to recipients when you send email."}
					</span>
				),
			},
			{
				name: "dailyQuota",
				label: dict?.platform?.dailyImapQuota ?? "Daily IMAP quota",
				kind: "select",
				options: imapQuotaList.map((quota) => ({
					label: quota.label,
					value: String(quota.value),
				})),
				props: {
					className: "w-full",
					defaultValue: String(defaultImapQuota),
				},
			},
		);
	}

	return (
		<ReusableForm
			action={connectCustomEmailProvider}
			onSuccess={onCompleted}
			fields={fields}
			notify={{ kind: "toast" }}
			submitButtonProps={{
				submitLabel: provider.imap
					? (dict?.platform?.connectMailbox ?? "Connect mailbox")
					: (dict?.platform?.addAccount ?? "Add account"),
				wrapperClasses: "mt-6",
				fullWidth: true,
			}}
		/>
	);
}
