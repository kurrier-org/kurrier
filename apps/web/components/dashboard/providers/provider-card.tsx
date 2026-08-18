"use client";
import { ProviderSpec } from "@schema";
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Edit, ExternalLink, Globe, Play } from "lucide-react";
import * as React from "react";
import {
	FetchDecryptedSecretsResult,
	SyncProvidersRow,
	verifyProviderAccount,
} from "@/lib/actions/dashboard";
import ProviderEditForm from "@/components/dashboard/providers/provider-edit-form";
import { modals } from "@mantine/modals";
import { Button } from "@mantine/core";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { parseSecret } from "@/lib/utils";
import IsVerifiedStatus from "@/components/dashboard/providers/is-verified-status";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

export default function ProviderCard({
	spec,
	userProvider,
	decryptedSecret,
}: {
	spec: ProviderSpec;
	userProvider: SyncProvidersRow;
	decryptedSecret: FetchDecryptedSecretsResult[number];
}) {
	const dict = useOptionalDictionary();
	const decryptedValues = useMemo(() => {
		return parseSecret(decryptedSecret);
	}, [decryptedSecret]);

	const openEdit = () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					{dict?.platform?.editPrefix ?? "Edit "}
					{spec.name}
					{dict?.platform?.editAccountSuffix ?? " Account"}
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

			if (res.ok && (res.meta?.send || res.meta?.store)) {
				toast.success(
					`${userProvider.type.toUpperCase()} ${dict?.platform?.connectionVerified ?? "connection verified"}`,
					{
						description: (() => {
							switch (userProvider.type) {
								case "ses":
									return (
										dict?.platform?.sesCredentialsValid ??
										"SES credentials are valid and the account is reachable."
									);
								case "postmark":
									return (
										dict?.platform?.postmarkCredentialsValid ??
										"Postmark credentials are valid and the API is reachable."
									);
								case "sendgrid":
									return (
										dict?.platform?.sendgridCredentialsValid ??
										"SendGrid API key is valid and sending is enabled."
									);
								case "mailgun":
									return (
										dict?.platform?.mailgunCredentialsValid ??
										"Mailgun credentials are valid and the account is reachable."
									);
								case "s3":
									return (
										dict?.platform?.s3CredentialsValid ??
										"S3 credentials are valid and the account is reachable."
									);
								default:
									return (
										dict?.platform?.outgoingMailServerReachable ??
										"Outgoing mail server is reachable and credentials are valid."
									);
							}
						})(),
					},
				);
			} else {
				toast.error(
					`${userProvider.type.toUpperCase()} ${dict?.platform?.verificationFailed ?? "verification failed"}`,
					{
						description:
							String(res.meta?.response ?? res.message) ||
							(dict?.platform?.couldNotConnectWithCredentials ??
								"Could not connect with the provided credentials."),
					},
				);
			}
		} catch (err: any) {
			toast.error(dict?.platform?.verificationError ?? "Verification error", {
				description:
					err?.message ??
					dict?.platform?.unexpectedErrorTestingAccount ??
					"Unexpected error while testing the account.",
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
									{(dict?.platform as Record<string, string> | undefined)?.[
										`providerName${spec.key.charAt(0).toUpperCase()}${spec.key.slice(1)}`
									] ?? spec.name}
								</CardTitle>
								<p className="text-sm text-muted-foreground">
									{dict?.platform?.managedSecurelyVerifyByAdding ??
										"Managed securely in a secure Vault. Verify by adding or removing stored credentials."}
								</p>
							</div>
						</div>

						<div className="flex flex-wrap gap-2">
							<CardAction className="flex w-full flex-wrap gap-2 lg:w-auto lg:flex-nowrap lg:justify-end">
								<Button
									variant="outline"
									component={"a"}
									size={"xs"}
									href={spec.docsUrl}
									target="_blank"
									leftSection={<ExternalLink className="size-4" />}
								>
									{dict?.platform?.docs ?? "Docs"}
								</Button>

								<Button
									onClick={initVerifyAccount}
									loading={testing}
									size={"xs"}
									leftSection={<Play className="size-4" />}
								>
									{dict?.platform?.verifyConnection ?? "Verify Connection"}
								</Button>
								<Button
									onClick={openEdit}
									size={"xs"}
									leftSection={<Edit className="size-4" />}
								>
									{dict?.platform?.edit ?? "Edit"}
								</Button>
							</CardAction>
						</div>
					</div>
					<IsVerifiedStatus
						verified={decryptedValues.verified}
						statusName={""}
					/>
				</CardHeader>
			</Card>
		</div>
	);
}
