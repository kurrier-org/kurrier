"use client";
import React from "react";
import {
	FetchDecryptedSecretsResultRow,
	upsertSMTPAccount,
} from "@/lib/actions/dashboard";
import { SMTP_SPEC } from "@schema";
import { ReusableForm } from "@/components/common/reusable-form";
import { ulid } from "ulid";
import { VerifyResult } from "@providers";
import { parseSecret } from "@/lib/utils";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

function NewSmtpAccountForm({
	smtpSecret,
	onCompleted,
}: {
	smtpSecret?: FetchDecryptedSecretsResultRow;
	onCompleted?: (res: VerifyResult) => void;
}) {
	const dict = useOptionalDictionary();
	const parsedVaultValues = parseSecret(smtpSecret);

	const fields = [
		{
			name: "ulid",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: ulid() },
		},
		{
			name: "secretId",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: smtpSecret?.linkRow?.secretId },
		},
		{
			name: "accountId",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: smtpSecret?.linkRow?.accountId },
		},

		{
			name: "label",
			label: (
				<code className="rounded bg-muted/50 px-2 py-1 text-xs">
					{dict?.platform?.accountLabel ?? "ACCOUNT LABEL"}
				</code>
			),
			required: true,
			props: {
				autoComplete: "off",
				required: true,
				placeholder:
					dict?.platform?.mySmtpAccountPlaceholder ?? "My SMTP Account",
				defaultValue: parsedVaultValues
					? (parsedVaultValues["label"] ?? "")
					: "",
			},
		},

		...SMTP_SPEC.requiredEnv.map((rowKey: string) =>
			rowKey === "SMTP_SECURE" || rowKey === "SMTP_POOL"
				? {
						name: `required.${rowKey}`,
						label: (
							<code className="rounded bg-muted/50 px-2 py-1 text-xs">
								{rowKey}
							</code>
						),
						kind: "select" as const,
						options: [
							{ label: dict?.platform?.trueLabel ?? "TRUE", value: "true" },
							{ label: dict?.platform?.falseLabel ?? "FALSE", value: "false" },
						],
						required: false,
						wrapperClasses: "col-span-12 sm:col-span-6",
						props: {
							autoComplete: "off",
							required: true,
							defaultValue: parsedVaultValues
								? (parsedVaultValues[rowKey] ?? "false")
								: "false",
							className: "w-full",
						},
					}
				: {
						name: `required.${rowKey}`,
						label: (
							<code className="rounded bg-muted/50 px-2 py-1 text-xs">
								{rowKey}
							</code>
						),
						required: true,
						wrapperClasses: "col-span-12 sm:col-span-6",
						props: {
							autoComplete: "off",
							required: true,
							// type: /PASSWORD/.test(rowKey) ? "password" : "text",
							defaultValue: parsedVaultValues
								? (parsedVaultValues[rowKey] ?? "")
								: "",
						},
					},
		),

		{
			el: (
				<div className="my-3 md:my-4">
					<h4 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
						{dict?.platform?.optionalImapConfig ??
							"Optional IMAP Config (Required for receiving emails)"}
					</h4>
				</div>
			),
		},

		...SMTP_SPEC.optionalEnv.map((rowKey: string) =>
			rowKey === "IMAP_SECURE"
				? {
						name: `optional.${rowKey}`,
						label: (
							<code className="rounded bg-muted/50 px-2 py-1 text-xs">
								{rowKey}
							</code>
						),
						kind: "select" as const,
						options: [
							{ label: dict?.platform?.trueLabel ?? "TRUE", value: "true" },
							{ label: dict?.platform?.falseLabel ?? "FALSE", value: "false" },
						],
						required: false,
						wrapperClasses: "col-span-12 sm:col-span-6",
						props: {
							autoComplete: "off",
							required: false,
							defaultValue: parsedVaultValues
								? (parsedVaultValues[rowKey] ?? "false")
								: "false",
							className: "w-full",
						},
					}
				: {
						name: `optional.${rowKey}`,
						label: (
							<code className="rounded bg-muted/50 px-2 py-1 text-xs">
								{rowKey}
							</code>
						),
						required: false,
						wrapperClasses: "col-span-12 sm:col-span-6",
						props: {
							autoComplete: "off",
							required: false,
							// type: /PASSWORD/.test(rowKey) ? "password" : "text",
							defaultValue: parsedVaultValues
								? (parsedVaultValues[rowKey] ?? "")
								: "",
						},
					},
		),
	];

	return (
		<ReusableForm
			action={upsertSMTPAccount}
			onSuccess={onCompleted ? onCompleted : undefined}
			fields={fields}
			{...(parsedVaultValues
				? {
						submitButtonProps: {
							submitLabel: dict?.platform?.save ?? "Save",
							wrapperClasses: "justify-center mt-6 flex",
							fullWidth: true,
						},
					}
				: {})}
		/>
	);
}

export default NewSmtpAccountForm;
