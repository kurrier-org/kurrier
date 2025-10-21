"use client";
import { ProviderSpec } from "@schema";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Edit, ExternalLink, Globe, Play, Trash, Unplug } from "lucide-react";
import * as React from "react";
import {
	FetchDecryptedSecretsResult,
	SyncProvidersRow,
	verifyProviderAccount,
} from "@/lib/actions/dashboard";
import ProviderEditForm from "@/components/dashboard/providers/provider-edit-form";
import { modals } from "@mantine/modals";
import NewSmtpAccountForm from "@/components/dashboard/providers/new-smtp-account-form";
import { ActionIcon, Button } from "@mantine/core";
import { useMemo, useState } from "react";
import { VerifyResult } from "@providers";
import { toast } from "sonner";
import { parseSecret } from "@/lib/utils";
import IsVerifiedStatus from "@/components/dashboard/providers/is-verified-status";

export default function ProviderCard({
	spec,
	userProvider,
	decryptedSecret,
}: {
	spec: ProviderSpec;
	userProvider: SyncProvidersRow;
	decryptedSecret: FetchDecryptedSecretsResult[number];
}) {
	const decryptedValues = useMemo(() => {
		return parseSecret(decryptedSecret);
	}, [decryptedSecret]);

	// const openUnplug = () => {
	//     const openModalId = modals.open({
	//         title: (
	//             <div className="font-semibold text-brand-foreground">
	//                 Unplug {spec.name} Account
	//             </div>
	//         ),
	//         size: "lg",
	//         children: (
	//             <CardContent className={"my-6"}>
	//                 <div className="space-y-3 flex flex-col gap-12">
	//                     Warning: This action will remove the kurrier related assets from your {spec.name} account and from your
	//                     dashboard. You can re-add the account later if needed.
	//
	//                     <Button
	//                         // onClick={() => initTestAccount()}
	//                         onClick={initDisconnect}
	//                         loading={disconnecting}
	//                         size={"xs"}
	//                         color={"red"}
	//                         leftSection={<Unplug className="size-4" />}
	//                         // className="h-8 px-3 text-xs lg:h-9 lg:px-4 lg:text-sm gap-2"
	//                     >
	//                         Disconnect Connection
	//                     </Button>
	//                 </div>
	//             </CardContent>
	//         ),
	//     });
	// }
	//
	// const [disconnecting, setDisconnecting] = useState(false);
	// const initDisconnect = async () => {
	//     setDisconnecting(true)
	//     const { data: res } = await disconnectProviderAccount(
	//         userProvider.type,
	//         decryptedSecret,
	//     );
	//
	// }

	const openEdit = () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					Edit {spec.name} Account
				</div>
			),
			size: "lg",
			children: (
				<CardContent className={"my-6"}>
					<div className="space-y-3">
						<input
							type={"hidden"}
							name={"providerId"}
							value={userProvider.id}
						/>
						<ProviderEditForm
							spec={spec}
							onCompleted={() => modals.close(openModalId)}
							providerId={userProvider.id}
							decryptedSecret={decryptedSecret}
						/>
					</div>
				</CardContent>
			),
		});
	};

	const [testing, setTesting] = useState(false);
	const initVerifyAccount = async () => {
		setTesting(true);
		try {
			const { data: res } = await verifyProviderAccount(
				userProvider.type,
				decryptedSecret,
			);

			if (res.ok && res.meta?.send) {
				toast.success(
					`${userProvider.type.toUpperCase()} connection verified`,
					{
						description: (() => {
							switch (userProvider.type) {
								case "ses":
									return "SES credentials are valid and the account is reachable.";
								case "postmark":
									return "Postmark credentials are valid and the API is reachable.";
								case "sendgrid":
									return "SendGrid API key is valid and sending is enabled.";
								case "mailgun":
									return "Mailgun credentials are valid and the account is reachable.";
								default:
									return "Outgoing mail server is reachable and credentials are valid.";
							}
						})(),
					},
				);
			} else {
				toast.error(`${userProvider.type.toUpperCase()} verification failed`, {
					description:
						String(res.meta?.response ?? res.message) ||
						"Could not connect with the provided credentials.",
				});
			}
		} catch (err: any) {
			toast.error("Verification error", {
				description:
					err?.message ?? "Unexpected error while testing the account.",
			});
		} finally {
			setTesting(false);
		}
	};

	return (
		<div>
			<Card className="shadow-none relative">
				<CardHeader className="gap-3">
					<div className="flex flex-col gap-3">
						<div className="flex min-w-0 items-start gap-3">
							<Globe className="mt-1 size-4 shrink-0 text-muted-foreground" />
							<div className="min-w-0">
								<CardTitle className="text-lg sm:text-xl">
									{spec.name}
								</CardTitle>
								<p className="text-sm text-muted-foreground">
									Managed securely in a secure Vault. Verify by adding or
									removing stored credentials.
								</p>
							</div>
						</div>

						{/* Actions BELOW (unchanged) */}
						<div className="flex flex-wrap gap-2">
							<CardAction className="flex w-full flex-wrap gap-2 lg:w-auto lg:flex-nowrap lg:justify-end">
								{/*<StatusBadge ok={allGood} />*/}

								<Button
									variant="outline"
									// asChild
									component={"a"}
									size={"xs"}
									href={spec.docsUrl}
									target="_blank"
									// className="h-8 px-3 text-xs lg:h-9 lg:px-4 lg:text-sm"
									leftSection={<ExternalLink className="size-4" />}
								>
									Docs
								</Button>

								<Button
									// onClick={() => initTestAccount()}
									onClick={initVerifyAccount}
									loading={testing}
									size={"xs"}
									leftSection={<Play className="size-4" />}
									// className="h-8 px-3 text-xs lg:h-9 lg:px-4 lg:text-sm gap-2"
								>
									Verify Connection
								</Button>
								<Button
									onClick={openEdit}
									size={"xs"}
									leftSection={<Edit className="size-4" />}
									// className="h-8 px-3 text-xs lg:h-9 lg:px-4 lg:text-sm gap-2"
								>
									Edit
								</Button>
								{/*<ActionIcon onClick={openUnplug} color={"red"}>*/}
								{/*    <Unplug size={18} />*/}
								{/*</ActionIcon>*/}
							</CardAction>
						</div>
					</div>
					<IsVerifiedStatus
						verified={decryptedValues.verified}
						statusName={""}
					/>
				</CardHeader>

				{/*<CardContent className="space-y-4 mb-16">*/}
				{/*	<div className="text-xs uppercase tracking-wider text-muted-foreground">*/}
				{/*		Required ENV*/}
				{/*	</div>*/}

				{/*	<div className="space-y-3">*/}
				{/*		<input type={"hidden"} name={"providerId"} value={userProvider.id} />*/}
				{/*		<ProviderEditForm*/}
				{/*			spec={spec}*/}
				{/*			providerId={userProvider.id}*/}
				{/*			decryptedSecrets={decryptedSecrets}*/}
				{/*		/>*/}
				{/*	</div>*/}
				{/*</CardContent>*/}
			</Card>
		</div>
	);
}
