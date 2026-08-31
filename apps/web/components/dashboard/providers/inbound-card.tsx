"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { INBOUND_SPEC } from "@schema";
import { ArrowDownToLine, Plus } from "lucide-react";
import InboundIdentityCard from "@/components/dashboard/providers/inbound-identity-card";

import NewInboundIdentityForm from "@/components/dashboard/providers/new-inbound-identity-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FetchInboundIdentitiesResult } from "@/lib/actions/dashboard";

export default function InboundCard({
	inboundIdentities,
}: {
	inboundIdentities: FetchInboundIdentitiesResult;
}) {
	const dict = useOptionalDictionary();
	const openAddModal = () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					{dict?.platform?.createInboundIdentity ?? "Create Inbound Identity"}
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-2">
					<NewInboundIdentityForm
						onCompleted={() => modals.close(openModalId)}
					/>
				</div>
			),
		});
	};

	return (
		<div className="flex min-w-0 flex-col">
			<Card className="h-full min-w-0 border-border shadow-none">
				<CardHeader className="gap-2">
					<div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between">
						<div className="max-w-2xl">
							<div className="flex items-center gap-2">
								<ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
								<CardTitle className="text-xl">{INBOUND_SPEC.name}</CardTitle>
							</div>

							<p className="text-sm text-muted-foreground mt-1">
								{dict?.platform?.receiveRawEmailDescription ??
									"Receive raw email directly into Kurrier."}
							</p>

							<p className="text-xs text-muted-foreground/80 mt-1">
								{INBOUND_SPEC.help}
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
								{dict?.platform?.createIdentity ?? "Create Identity"}
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-6">
					{(!inboundIdentities || inboundIdentities.length === 0) && (
						<div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-4 bg-muted">
							<div>
								<div className="font-medium text-card-foreground">
									{dict?.platform?.noInboundIdentitiesYet ??
										"No inbound identities yet"}
								</div>

								<div className="text-xs text-card-foreground mt-1">
									{dict?.platform?.createIdentityToReceiveHelp ??
										"Create an identity to receive RFC822/EML messages through the Kurrier API."}
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
									{dict?.platform?.createInboundIdentity ??
										"Create Inbound Identity"}
								</Button>
							</div>
						</div>
					)}

					<div className="grid grid-cols-1 gap-4">
						{inboundIdentities?.map((row) => (
							<InboundIdentityCard key={row.identity.id} row={row} />
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
