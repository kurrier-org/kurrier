"use client";

import { ActionIcon, Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { Copy, Pencil } from "lucide-react";
import { toast } from "sonner";

import { ReusableForm } from "@/components/common/reusable-form";
import type { FetchDecryptedSecretsResultRow } from "@/lib/actions/dashboard";
import { saveMailtrapCredentials } from "@/lib/actions/dashboard";
import { parseSecret } from "@/lib/utils";

function CopyButton({ value }: { value: string }) {
	const copyValue = () => {
		if (!value) return;
		navigator.clipboard.writeText(value);
		toast.success("Copied");
	};

	return (
		<ActionIcon variant="subtle" size="sm" onClick={copyValue}>
			<Copy className="h-3.5 w-3.5" />
		</ActionIcon>
	);
}

function MailtrapCredentialsForm({
	providerId,
	decryptedSecret,
}: {
	providerId: string;
	decryptedSecret: FetchDecryptedSecretsResultRow | undefined;
}) {
	const existing = parseSecret(decryptedSecret);

	const fields = [
		{
			el: <input type="hidden" name="providerId" value={providerId} />,
		},
		{
			name: "apiToken",
			label: (
				<code className="rounded bg-muted/50 px-2 py-1 text-xs">
					MAILTRAP_API_TOKEN
				</code>
			),
			required: true,
			props: {
				required: true,
				autoComplete: "off",
				defaultValue: existing?.MAILTRAP_API_TOKEN ?? "",
				rightSection: existing?.MAILTRAP_API_TOKEN ? (
					<CopyButton value={existing.MAILTRAP_API_TOKEN} />
				) : undefined,
			},
		},
		{
			name: "webhookSecret",
			label: (
				<code className="rounded bg-muted/50 px-2 py-1 text-xs">
					MAILTRAP_WEBHOOK_SECRET
				</code>
			),
			required: true,
			props: {
				required: true,
				autoComplete: "off",
				defaultValue: existing?.MAILTRAP_WEBHOOK_SECRET ?? "",
				rightSection: existing?.MAILTRAP_WEBHOOK_SECRET ? (
					<CopyButton value={existing.MAILTRAP_WEBHOOK_SECRET} />
				) : undefined,
			},
			bottomStartPrefix: (
				<span className="text-xs text-muted-foreground">
					The webhook signing secret from your Mailtrap inbox's webhook
					settings.
				</span>
			),
		},
	];

	return (
		<ReusableForm
			action={saveMailtrapCredentials}
			fields={fields}
			onSuccess={() => modals.closeAll()}
			submitButtonProps={{
				submitLabel: "Save Mailtrap Credentials",
				wrapperClasses: "justify-center mt-6 flex",
				fullWidth: true,
			}}
		/>
	);
}

export default function MailtrapCredentialsButton({
	providerId,
	decryptedSecret,
}: {
	providerId: string;
	decryptedSecret: FetchDecryptedSecretsResultRow | undefined;
}) {
	const openModal = () => {
		modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					Edit Mailtrap Credentials
				</div>
			),
			size: "lg",
			closeOnEscape: false,
			closeOnClickOutside: false,
			children: (
				<div className="space-y-6 p-2">
					<div>
						<h3 className="text-base font-semibold">Mailtrap account</h3>

						<p className="mt-1 text-sm text-muted-foreground">
							Enter the API token and webhook signing secret from your Mailtrap
							account.
						</p>
					</div>

					<MailtrapCredentialsForm
						providerId={providerId}
						decryptedSecret={decryptedSecret}
					/>
				</div>
			),
		});
	};

	return (
		<Button
			size="xs"
			variant="outline"
			leftSection={<Pencil className="size-4" />}
			onClick={openModal}
		>
			Edit Credentials
		</Button>
	);
}
