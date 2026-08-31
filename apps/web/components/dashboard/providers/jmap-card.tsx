"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { JMAP_SPEC } from "@schema";
import { Mail, Plus } from "lucide-react";

import JmapAccountCard from "@/components/dashboard/providers/jmap-account-card";
import JmapConnectForm from "@/components/dashboard/providers/jmap-connect-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FetchJmapAccountsResult } from "@/lib/actions/jmap-actions";

export default function JmapCard({
									 jmapAccounts,
								 }: {
	jmapAccounts: FetchJmapAccountsResult;
}) {
	const dict = useOptionalDictionary();

	const openAddModal = () => {
		const modalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					{dict?.platform?.jmapConnectAccount ?? "Connect JMAP Account"}
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: <JmapConnectForm onCompleted={() => modals.close(modalId)} />,
		});
	};

	return (
		<div className="flex min-w-0 flex-col">
			<Card className="h-full min-w-0 overflow-hidden border-border shadow-none">
				<CardHeader className="px-5 py-4 sm:h-[210px] sm:px-6">
					<div className="flex h-full flex-col">
						<div className="min-w-0 max-w-2xl">
							<div className="flex items-center gap-2">
								<Mail className="size-5 shrink-0 text-muted-foreground" />

								<CardTitle className="text-base font-semibold sm:text-lg">
									{JMAP_SPEC.name} (BETA)
								</CardTitle>
							</div>

							<p className="mt-1 text-sm leading-5 text-muted-foreground">
								{dict?.platform?.jmapConnectAccountsDescription ??
									"Connect accounts from JMAP-compatible mail providers."}
							</p>

							<p className="mt-1 text-xs leading-5 text-muted-foreground/80">
								{JMAP_SPEC.help}
							</p>
						</div>

						<div className="mt-4 w-full sm:mt-auto sm:w-auto sm:self-start">
							<Button
								fullWidth
								size="sm"
								className="!min-h-11 !w-full sm:!min-h-10 sm:!w-auto sm:!px-5"
								onClick={openAddModal}
								leftSection={<Plus className="size-4" />}
							>
								{dict?.platform?.addJmapAccount ?? "Add JMAP Account"}
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4 border-t px-5 py-4 sm:px-6">
					{(!jmapAccounts || jmapAccounts.length === 0) && (
						<div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
							<div>
								<div className="text-sm font-medium text-foreground">
									{dict?.platform?.jmapNoAccountsConnected ??
										"No JMAP accounts connected"}
								</div>

								<div className="mt-1 text-xs leading-5 text-muted-foreground">
									{dict?.platform?.jmapConnectFastmailHelp ??
										"Connect Fastmail or another JMAP-compatible server."}
								</div>
							</div>

							<div className="w-full sm:w-auto">
								<Button
									fullWidth
									variant="default"
									size="sm"
									className="!min-h-10 !w-full sm:!w-auto"
									onClick={openAddModal}
									leftSection={<Plus className="size-4" />}
								>
									{dict?.platform?.addJmapAccount ?? "Add JMAP Account"}
								</Button>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4">
						{jmapAccounts?.map((account) => (
							<JmapAccountCard key={account.id} jmapAccount={account} />
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
