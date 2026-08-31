"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import type { ProviderSpec } from "@schema";
import {
	CheckCircle2,
	Edit,
	ExternalLink,
	Globe2,
	Play,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import ProviderEditForm from "@/components/dashboard/providers/provider-edit-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type FetchDecryptedSecretsResult,
	type SyncProvidersRow,
	verifyProviderAccount,
} from "@/lib/actions/dashboard";
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
	const dict = useOptionalDictionary();

	const decryptedValues = useMemo(() => {
		return parseSecret(decryptedSecret);
	}, [decryptedSecret]);

	const verified = Boolean(decryptedValues.verified);

	const providerName =
		(dict?.platform as Record<string, string> | undefined)?.[
			`providerName${spec.key.charAt(0).toUpperCase()}${spec.key.slice(1)}`
			] ?? spec.name;

	const openEdit = () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-foreground">
					{dict?.platform?.editPrefix ?? "Edit "}
					{spec.name}
					{dict?.platform?.editAccountSuffix ?? " Account"}
				</div>
			),
			size: "lg",
			children: (
				<CardContent className="my-6">
					<div className="space-y-3">
						<input
							type="hidden"
							name="providerId"
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
					`${userProvider.type.toUpperCase()} ${
						dict?.platform?.connectionVerified ?? "connection verified"
					}`,
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
					`${userProvider.type.toUpperCase()} ${
						dict?.platform?.verificationFailed ?? "verification failed"
					}`,
					{
						description:
							String(res.meta?.response ?? res.message) ||
							(dict?.platform?.couldNotConnectWithCredentials ??
								"Could not connect with the provided credentials."),
					},
				);
			}
		} catch (err: unknown) {
			toast.error(
				dict?.platform?.verificationError ?? "Verification error",
				{
					description:
						(err instanceof Error ? err.message : undefined) ??
						dict?.platform?.unexpectedErrorTestingAccount ??
						"Unexpected error while testing the account.",
				},
			);
		} finally {
			setTesting(false);
		}
	};

	return (
		<Card className="h-fit self-start overflow-hidden shadow-none transition-colors hover:border-foreground/15">
			<CardHeader className="px-5 py-4 sm:px-6 sm:py-4">
				<div className="flex items-start justify-between gap-3">
					<div className="flex min-w-0 items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
							<Globe2 className="size-5 text-muted-foreground" />
						</div>

						<div className="min-w-0">
							<CardTitle className="text-base font-semibold sm:text-lg">
								{providerName}
							</CardTitle>

							<p className="mt-1 max-w-md text-sm leading-5 text-muted-foreground">
								{dict?.platform?.managedSecurelyVerifyByAdding ??
									"Managed securely in a secure Vault. Verify by adding or removing stored credentials."}
							</p>
						</div>
					</div>

					<div className="shrink-0 [&_*]:whitespace-nowrap">
						<IsVerifiedStatus
							verified={decryptedValues.verified}
							statusName=""
						/>
					</div>
				</div>
			</CardHeader>

			<CardFooter className="border-t bg-muted/15 px-4 py-3 sm:px-6 sm:py-3">
				<div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
					<Button
						onClick={initVerifyAccount}
						loading={testing}
						size="sm"
						className="!min-h-11 !w-full sm:order-2 sm:!min-h-10 sm:!w-auto sm:!px-5"
						leftSection={<Play className="size-4" />}
					>
						{dict?.platform?.verifyConnection ?? "Verify Connection"}
					</Button>

					<div className="grid w-full grid-cols-2 gap-2 sm:order-1 sm:flex sm:w-auto sm:items-center">
						<Button
							variant="subtle"
							color="gray"
							component="a"
							size="sm"
							className="!min-h-10 !w-full sm:!w-auto"
							href={spec.docsUrl}
							target="_blank"
							rel="noreferrer"
							leftSection={<ExternalLink className="size-4" />}
						>
							{dict?.platform?.docs ?? "Docs"}
						</Button>

						<Button
							variant="subtle"
							color="gray"
							onClick={openEdit}
							size="sm"
							className="!min-h-10 !w-full sm:!w-auto"
							leftSection={<Edit className="size-4" />}
						>
							{dict?.platform?.edit ?? "Edit"}
						</Button>
					</div>
				</div>
			</CardFooter>
		</Card>
	);
}
