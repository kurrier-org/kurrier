"use client";

import { ActionIcon, Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { MAILTRAP_SPEC } from "@schema";
import { ArrowDownToLine, Copy, ExternalLink, Info, Play, Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import IsVerifiedStatus from "@/components/dashboard/providers/is-verified-status";
import MailtrapCredentialsButton from "@/components/dashboard/providers/mailtrap-credentials-form";
import MailtrapIdentityCard from "@/components/dashboard/providers/mailtrap-identity-card";
import NewMailtrapIdentityForm from "@/components/dashboard/providers/new-mailtrap-identity-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
	FetchDecryptedSecretsResultRow,
	FetchProviderIdentitiesResult,
} from "@/lib/actions/dashboard";
import { verifyMailtrapConnection } from "@/lib/actions/dashboard";
import { parseSecret } from "@/lib/utils";

export default function MailtrapCard({
	providerId,
	webhookUrl,
	mailtrapIdentities,
	decryptedSecret,
}: {
	providerId: string;
	webhookUrl: string;
	mailtrapIdentities: FetchProviderIdentitiesResult;
	decryptedSecret: FetchDecryptedSecretsResultRow | undefined;
}) {
	const verified = Boolean(parseSecret(decryptedSecret).verified);

	const [testing, setTesting] = React.useState(false);

	const runVerify = async () => {
		if (!decryptedSecret) {
			toast.error("Configure Mailtrap credentials first");
			return;
		}

		setTesting(true);
		try {
			const { data: res } = await verifyMailtrapConnection(decryptedSecret);

			if (res?.ok) {
				toast.success("Mailtrap connection verified", {
					description: res.message,
				});
			} else {
				toast.error("Mailtrap verification failed", {
					description: res?.message,
				});
			}
		} finally {
			setTesting(false);
		}
	};

	const openAddModal = () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					Add Mailtrap Identity
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-2">
					<NewMailtrapIdentityForm
						onCompleted={() => modals.close(openModalId)}
					/>
				</div>
			),
		});
	};

	const copyWebhookUrl = () => {
		navigator.clipboard.writeText(webhookUrl);
		toast.success("Webhook URL copied");
	};

	return (
		<div className="flex flex-col">
			<Card className="h-full shadow-none border-border">
				<CardHeader className="gap-2">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
							<CardTitle className="text-xl">{MAILTRAP_SPEC.name}</CardTitle>
						</div>

						<IsVerifiedStatus verified={verified} />
					</div>

					<p className="text-sm text-muted-foreground">
						Receive email through Mailtrap inbound inboxes.
					</p>

					<p className="text-xs text-muted-foreground/80">
						{MAILTRAP_SPEC.help}
					</p>
				</CardHeader>

				<CardContent className="space-y-6">
					<div className="rounded-md border bg-muted/50 divide-y divide-border overflow-hidden">
						<div className="p-4">
							<div className="text-sm font-medium text-foreground">
								Webhook URL
							</div>
							<p className="mt-0.5 text-xs text-muted-foreground">
								Configure this URL as your webhook endpoint in Mailtrap.
							</p>

							<div className="mt-2 flex items-center gap-2">
								<code className="block flex-1 truncate text-sm font-medium text-foreground">
									{webhookUrl}
								</code>

								<ActionIcon variant="subtle" onClick={copyWebhookUrl}>
									<Copy className="h-3.5 w-3.5" />
								</ActionIcon>
							</div>
						</div>

						<div className="grid grid-cols-1 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
							<div className="p-4">
								<div className="text-sm font-medium text-foreground">
									Credentials
								</div>
								<p className="mt-0.5 text-xs text-muted-foreground">
									Stored securely in your workspace vault.
								</p>

								<div className="mt-3">
									<MailtrapCredentialsButton
										providerId={providerId}
										decryptedSecret={decryptedSecret}
									/>
								</div>
							</div>

							<div className="p-4">
								<div className="text-sm font-medium text-foreground">
									Test Connection
								</div>
								<p className="mt-0.5 text-xs text-muted-foreground">
									Verify we can access your Mailtrap account.
								</p>

								<Button
									className="mt-3"
									size="sm"
									variant="filled"
									leftSection={<Play className="h-4 w-4" />}
									loading={testing}
									onClick={runVerify}
								>
									Test Connection
								</Button>
							</div>
						</div>
					</div>

					<Separator />

					<div>
						<Button size="sm" className="gap-2" onClick={openAddModal}>
							<Plus className="h-4 w-4" />
							Add Identity
						</Button>
					</div>

					{(!mailtrapIdentities || mailtrapIdentities.length === 0) && (
						<div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-4 bg-muted">
							<div>
								<div className="font-medium text-card-foreground">
									No Mailtrap identities yet
								</div>

								<div className="text-xs text-card-foreground mt-1">
									Add the email address that routes into your Mailtrap inbox.
								</div>
							</div>

							<Button
								variant="default"
								size="sm"
								className="gap-2"
								onClick={openAddModal}
							>
								<Plus className="h-4 w-4" />
								Add Mailtrap Identity
							</Button>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4">
						{mailtrapIdentities?.map((row) => (
							<MailtrapIdentityCard key={row.identity.id} row={row} />
						))}
					</div>

					<Separator />

					<div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-1.5">
							<Info className="h-3.5 w-3.5 shrink-0" />
							Incoming emails will be processed and stored in the identity
							mailboxes you choose.
						</div>

						<a
							href="https://mailtrap.io/inbound-email/"
							target="_blank"
							rel="noreferrer"
							className="flex shrink-0 items-center gap-1 text-primary hover:underline"
						>
							Learn more about Mailtrap
							<ExternalLink className="h-3 w-3 shrink-0" />
						</a>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
