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
			<Card className="h-full min-w-0 border-border shadow-none">
				<CardHeader className="gap-2">
					<div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between">
						<div className="max-w-2xl">
							<div className="flex items-center gap-2">
								<Mail className="h-5 w-5 text-muted-foreground" />

								<CardTitle className="text-xl">
									{JMAP_SPEC.name} (BETA)
								</CardTitle>
							</div>

							<p className="mt-1 text-sm text-muted-foreground">
								{dict?.platform?.jmapConnectAccountsDescription ??
									"Connect accounts from JMAP-compatible mail providers."}
							</p>

							<p className="mt-1 text-xs text-muted-foreground/80">
								{JMAP_SPEC.help}
							</p>
						</div>

						<div className="mt-3 w-full 2xl:mt-0 2xl:w-fit">
							<Button
								fullWidth
								size="sm"
								className="!min-h-11 !w-full gap-2 2xl:!min-h-9 2xl:!w-auto"
								onClick={openAddModal}
							>
								<Plus className="h-4 w-4" />
								{dict?.platform?.addJmapAccount ?? "Add JMAP Account"}
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-6">
					{(!jmapAccounts || jmapAccounts.length === 0) && (
						<div className="flex flex-col items-center gap-4 rounded-md border border-dashed bg-muted p-6 text-center text-sm text-muted-foreground">
							<div>
								<div className="font-medium text-card-foreground">
									{dict?.platform?.jmapNoAccountsConnected ??
										"No JMAP accounts connected"}
								</div>

								<div className="mt-1 text-xs text-card-foreground">
									{dict?.platform?.jmapConnectFastmailHelp ??
										"Connect Fastmail or another JMAP-compatible server."}
								</div>
							</div>

							<div className="w-full sm:w-fit">
								<Button
									fullWidth
									variant="default"
									size="sm"
									className="!h-auto !min-h-9 gap-2 !py-2"
									classNames={{ label: "!whitespace-normal text-center" }}
									onClick={openAddModal}
								>
									<Plus className="h-4 w-4" />
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
