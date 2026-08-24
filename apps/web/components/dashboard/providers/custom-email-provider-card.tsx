"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { CustomEmailProvider } from "@schema";
import { Inbox, Mail, Plus, Send } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import NewCustomEmailProviderAccountForm from "@/components/dashboard/providers/new-custom-email-provider-account-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	Card,
	CardContent,
	CardDescription,
	CardTitle,
} from "@/components/ui/card";

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
		<div className="flex min-w-0 items-center gap-3 border-l pl-4">
			<div className="text-muted-foreground">{icon}</div>
			<div className="min-w-0">
				<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{label}
				</p>
				<p className="break-all font-mono text-sm">
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
	const dict = useOptionalDictionary();
	const params = useParams<{ wPublicId: string }>();
	const router = useRouter();

	const openAddModal = () => {
		const modalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					{(dict?.platform?.connectProviderPrefix ?? "Connect ") +
						provider.name}
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-2">
					<NewCustomEmailProviderAccountForm
						provider={provider}
						onCompleted={(data) => {
							modals.close(modalId);
							if (data?.identityPublicId && data.mailboxSlug) {
								router.push(
									`/w/${params.wPublicId}/dashboard/mail/${data.identityPublicId}/${data.mailboxSlug}`,
								);
								router.refresh();
							}
						}}
					/>
				</div>
			),
		});
	};

	return (
		<Card className="grid gap-0 overflow-hidden py-0 shadow-none lg:grid-cols-[minmax(14rem,0.75fr)_minmax(24rem,1.25fr)_auto]">
			<CardContent className="flex flex-col p-5">
				<div className="flex min-w-0 items-start gap-3">
					<Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
					<div className="min-w-0">
						<CardTitle className="text-lg">{provider.name}</CardTitle>
						<CardDescription className="mt-1">
							{provider.description ??
								dict?.platform?.configuredByAdminDescription ??
								"Configured by your administrator."}
						</CardDescription>
					</div>
				</div>
				<span className="mt-4 inline-flex self-start rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
					{!provider.imap
						? (dict?.platform?.smtpOnlyBadge ?? "SMTP only")
						: provider.credentialMode === "shared"
							? (dict?.platform?.sharedLoginBadge ?? "Shared login")
							: (dict?.platform?.separateLoginsBadge ?? "Separate logins")}
				</span>
			</CardContent>
			<CardContent className="grid gap-3 border-t p-5 lg:border-t-0 lg:border-l">
				<div className="grid gap-2">
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
			</CardContent>
			<CardContent className="flex items-center border-t bg-muted/10 p-5 lg:border-t-0 lg:border-l">
				<Button
					size="xs"
					className="w-full lg:w-auto"
					leftSection={<Plus className="size-4" />}
					onClick={openAddModal}
				>
					{provider.imap
						? (dict?.platform?.addMailbox ?? "Add mailbox")
						: (dict?.platform?.addAccount ?? "Add account")}
				</Button>
			</CardContent>
		</Card>
	);
}
