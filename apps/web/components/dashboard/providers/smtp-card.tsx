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
			<Card className="min-w-0 border-border shadow-none">
				<CardHeader className="gap-2">
					<div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between">
						<div className="max-w-2xl">
							<CardTitle className="text-xl">SMTP/IMAP Accounts</CardTitle>
							<p className="text-sm text-muted-foreground mt-1">
								Manage connected email accounts. Credentials are stored in your
								vault.
							</p>
							<p className="text-xs text-muted-foreground/80 mt-1">
								{dict?.platform?.smtpSpecHelp ?? SMTP_SPEC.help}
							</p>
						</div>

						<div className="mt-3 w-full 2xl:mt-0 2xl:w-fit">
							<Button
								fullWidth
								size="sm"
								onClick={openAddModal}
								className="!min-h-11 !w-full gap-2 2xl:!min-h-9 2xl:!w-auto"
							>
								<Plus className="h-4 w-4" />
								Add Generic Account
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-6">
					{(!smtpSecrets || smtpSecrets.length === 0) && (
						<div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-4 bg-muted">
							<div>
								<div className="font-medium text-card-foreground">
									{dict?.platform?.noSmtpAccountsYet ?? "No SMTP accounts yet"}
								</div>
								<div className="text-xs text-card-foreground mt-1">
									{dict?.platform?.addAccountToStartSending ??
										"Add an account to start sending mail from your app."}
								</div>
							</div>
							<div className="w-full sm:w-fit">
								<Button
									fullWidth
									variant="default"
									size="sm"
									onClick={openAddModal}
									className="!h-auto !min-h-9 gap-2 !py-2"
									classNames={{ label: "!whitespace-normal text-center" }}
								>
									<Plus className="h-4 w-4" />
									Add Generic Account
								</Button>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4">
						{!!smtpSecrets?.length &&
							smtpSecrets.map((smtpSecret) => {
								return (
									<SmtpAccountCard
										smtpSecret={smtpSecret}
										key={smtpSecret.metaId}
									/>
								);
							})}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
