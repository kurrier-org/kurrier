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
			<Card className="h-full min-w-0 overflow-hidden border-border shadow-none">
				<CardHeader className="px-5 py-4 sm:h-[210px] sm:px-6">
					<div className="flex h-full flex-col">
						<div className="min-w-0 max-w-2xl">
							<div className="flex items-center gap-2">
								<ArrowDownToLine className="size-5 shrink-0 text-muted-foreground" />

								<CardTitle className="text-base font-semibold sm:text-lg">
									{INBOUND_SPEC.name}
								</CardTitle>
							</div>

							<p className="mt-1 text-sm leading-5 text-muted-foreground">
								{dict?.platform?.receiveRawEmailDescription ??
									"Receive raw email directly into Kurrier."}
							</p>

							<p className="mt-1 text-xs leading-5 text-muted-foreground/80">
								{INBOUND_SPEC.help}
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
								{dict?.platform?.createIdentity ?? "Create Identity"}
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4 border-t px-5 py-4 sm:px-6">
					{(!inboundIdentities || inboundIdentities.length === 0) && (
						<div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
							<div>
								<div className="text-sm font-medium text-foreground">
									{dict?.platform?.noInboundIdentitiesYet ??
										"No inbound identities yet"}
								</div>

								<div className="mt-1 text-xs leading-5 text-muted-foreground">
									{dict?.platform?.createIdentityToReceiveHelp ??
										"Create an identity to receive RFC822/EML messages through the Kurrier API."}
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
