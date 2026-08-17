"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { CustomEmailProvider } from "@schema";
import { Inbox, Plus, Send } from "lucide-react";
import NewCustomEmailProviderAccountForm from "@/components/dashboard/providers/new-custom-email-provider-account-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Endpoint({
	icon,
	label,
	host,
	port,
}: {
	icon: React.ReactNode;
	label: string;
	host: string;
	port: number;
}) {
	return (
		<div className="flex min-w-0 items-center gap-3 py-2">
			<div className="text-muted-foreground">{icon}</div>
			<div className="min-w-0">
				<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{label}
				</p>
				<p className="truncate font-mono text-sm">
					{host}:{port}
				</p>
			</div>
		</div>
	);
}

export default function CustomEmailProviderCard({
	provider,
}: {
	provider: CustomEmailProvider;
}) {
	const openAddModal = () => {
		const modalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					Connect {provider.name}
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-2">
					<NewCustomEmailProviderAccountForm
						provider={provider}
						onCompleted={() => modals.close(modalId)}
					/>
				</div>
			),
		});
	};

	return (
		<Card className="shadow-none">
			<CardHeader className="gap-3">
				<div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
					<div className="min-w-0">
						<CardTitle className="text-lg">{provider.name}</CardTitle>
						<p className="mt-1 text-sm text-muted-foreground">
							{provider.description ?? "Configured by your administrator."}
						</p>
					</div>
					<span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
						{!provider.imap
							? "SMTP only"
							: provider.credentialMode === "shared"
								? "Shared login"
								: "Separate logins"}
					</span>
				</div>
			</CardHeader>
			<CardContent>
				<div className="divide-y border-y">
					<Endpoint
						icon={<Send className="size-4" />}
						label="SMTP"
						host={provider.smtp.host}
						port={provider.smtp.port}
					/>
					{provider.imap ? (
						<Endpoint
							icon={<Inbox className="size-4" />}
							label="IMAP"
							host={provider.imap.host}
							port={provider.imap.port}
						/>
					) : null}
				</div>

				<div className="mt-4 flex justify-end">
					<Button
						size="xs"
						leftSection={<Plus className="size-4" />}
						onClick={openAddModal}
					>
						Add account
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
