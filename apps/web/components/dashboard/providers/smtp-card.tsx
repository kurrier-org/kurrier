"use client";
import { SMTP_SPEC } from "@schema";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Plus } from "lucide-react";
import * as React from "react";
import { modals } from "@mantine/modals";
import NewSmtpAccountForm from "@/components/dashboard/providers/new-smtp-account-form";
import { FetchDecryptedSecretsResult } from "@/lib/actions/dashboard";
import SmtpAccountCard from "@/components/dashboard/providers/smtp-account-card";
import { Button } from "@mantine/core";

export default function SMTPCard({
	smtpSecrets,
}: {
	smtpSecrets: FetchDecryptedSecretsResult;
}) {
	const openAddModal = () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					Add SMTP Account
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
		<div className="grid grid-cols-12">
			<div className="col-span-12 flex flex-col">
				<Card className={"shadow-none border-border"}>
					<CardHeader className="gap-2">
						<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
							<div className="max-w-2xl">
								<CardTitle className="text-xl">{SMTP_SPEC.name}</CardTitle>
								<p className="text-sm text-muted-foreground mt-1">
									Manage app-level SMTP accounts. Secrets are stored in your
									vault and linked to accounts here.
								</p>
								<p className="text-xs text-muted-foreground/80 mt-1">
									{SMTP_SPEC.help}
								</p>
							</div>

							<CardAction className="mt-3 lg:mt-0">
								<Button size="sm" onClick={openAddModal} className="gap-2">
									<Plus className="h-4 w-4" />
									Add SMTP Account
								</Button>
							</CardAction>
						</div>
					</CardHeader>

					<CardContent className="space-y-6">
						{(!smtpSecrets || smtpSecrets.length === 0) && (
							<div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-4 bg-muted">
								<div>
									<div className="font-medium text-card-foreground">
										No SMTP accounts yet
									</div>
									<div className="text-xs text-card-foreground mt-1">
										Add an account to start sending mail from your app.
									</div>
								</div>
								<Button
									variant="default"
									size="sm"
									onClick={openAddModal}
									className="gap-2"
								>
									<Plus className="h-4 w-4" />
									Add SMTP Account
								</Button>
							</div>
						)}

						<div className="grid grid-cols-12 gap-6">
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
		</div>
	);
}
