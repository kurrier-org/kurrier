"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { SMTP_SPEC } from "@schema";
import { Plus } from "lucide-react";

import NewSmtpAccountForm from "@/components/dashboard/providers/new-smtp-account-form";
import SmtpAccountCard from "@/components/dashboard/providers/smtp-account-card";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FetchDecryptedSecretsResult } from "@/lib/actions/dashboard";

export default function SMTPCard({
									 smtpSecrets,
								 }: {
	smtpSecrets: FetchDecryptedSecretsResult;
}) {
	const dict = useOptionalDictionary();

	const openAddModal = () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					{dict?.platform?.addSmtpAccount ?? "Add SMTP Account"}
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-2">
					<NewSmtpAccountForm onCompleted={() => modals.close(openModalId)} />
				</div>
			),
		});
	};

	return (
		<div className="flex min-w-0 flex-col">
			<Card className="h-full min-w-0 overflow-hidden border-border shadow-none">
				<CardHeader className="px-5 py-4 sm:h-[210px] sm:px-6">
					<div className="flex h-full flex-col">
						<div className="min-w-0 max-w-2xl">
							<CardTitle className="text-base font-semibold sm:text-lg">
								SMTP/IMAP Accounts
							</CardTitle>

							<p className="mt-1 text-sm leading-5 text-muted-foreground">
								Manage connected email accounts. Credentials are stored in your
								vault.
							</p>

							<p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground/80">
								{dict?.platform?.smtpSpecHelp ?? SMTP_SPEC.help}
							</p>
						</div>

						<div className="mt-4 w-full sm:mt-auto sm:w-auto sm:self-start">
							<Button
								fullWidth
								size="sm"
								onClick={openAddModal}
								className="!min-h-11 !w-full sm:!min-h-10 sm:!w-auto sm:!px-5"
								leftSection={<Plus className="size-4" />}
							>
								Add Generic Account
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4 border-t px-5 py-4 sm:px-6">
					{(!smtpSecrets || smtpSecrets.length === 0) && (
						<div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
							<div>
								<div className="text-sm font-medium text-foreground">
									{dict?.platform?.noSmtpAccountsYet ??
										"No SMTP accounts yet"}
								</div>

								<div className="mt-1 text-xs leading-5 text-muted-foreground">
									{dict?.platform?.addAccountToStartSending ??
										"Add an account to start sending mail from your app."}
								</div>
							</div>

							<div className="w-full sm:w-auto">
								<Button
									fullWidth
									variant="default"
									size="sm"
									onClick={openAddModal}
									className="!min-h-10 !w-full sm:!w-auto"
									leftSection={<Plus className="size-4" />}
								>
									Add Generic Account
								</Button>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4">
						{!!smtpSecrets?.length &&
							smtpSecrets.map((smtpSecret) => (
								<SmtpAccountCard
									smtpSecret={smtpSecret}
									key={smtpSecret.metaId}
								/>
							))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
