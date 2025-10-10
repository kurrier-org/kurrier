import React, { useState } from "react";
import {
	deleteSmtpAccount,
	FetchDecryptedSecretsResultRow,
	verifySmtpAccount,
} from "@/lib/actions/dashboard";
import { modals } from "@mantine/modals";
import NewSmtpAccountForm from "@/components/dashboard/providers/new-smtp-account-form";
import { cn, parseSecret } from "@/lib/utils";
import { Lock, Mail, Pencil, Play, ShieldCheck, Trash2 } from "lucide-react";
import { ActionIcon, Button } from "@mantine/core";
import { toast } from "sonner";
import IsVerifiedStatus from "@/components/dashboard/providers/is-verified-status";
import { VerifyResult } from "@providers";

function SmtpAccountCard({
	smtpSecret,
}: {
	smtpSecret: FetchDecryptedSecretsResultRow;
}) {
	const parsedVaultValues = parseSecret(smtpSecret);
	const openEdit = () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					Edit SMTP Account
				</div>
			),
			size: "lg",
			children: (
				<div className="p-2">
					<NewSmtpAccountForm
						smtpSecret={smtpSecret}
						onCompleted={() => modals.close(openModalId)}
						// onCompleted={(res: VerifyResult) => {
						//     initiateSMTPTest(res)
						//     modals.close(openModalId)
						// }}
					/>
				</div>
			),
		});
	};

	const confirmDelete = () =>
		modals.openConfirmModal({
			title: (
				<div className={"font-semibold text-brand-foreground"}>
					Delete SMTP Account
				</div>
			),
			centered: true,
			children: (
				<div className="text-sm ">
					Are you sure you want to delete <b>{parsedVaultValues.label}</b>? This
					will remove the account and unlink any associated secrets.
				</div>
			),
			labels: { confirm: "Delete", cancel: "Cancel" },
			confirmProps: { color: "red" },
			onConfirm: async () => {
				const { success } = await deleteSmtpAccount(
					String(smtpSecret?.linkRow?.accountId),
				);
				if (success) {
					toast.success("SMTP account deleted");
				}
			},
		});

	const [testing, setTesting] = useState(false);

	// const initiateSMTPTest = async (verifyResponse?: VerifyResult) => {
	const initiateVerifySMTP = async () => {
		setTesting(true);

		try {
			// const res = verifyResponse ? verifyResponse : await testSmtpAccount(smtpSecret);
			const { data: res } = await verifySmtpAccount(smtpSecret);

			if (res?.meta?.send) {
				toast.success("SMTP connection verified", {
					description:
						"Outgoing mail server is reachable and credentials are valid.",
				});
			} else {
				toast.error("SMTP verification failed", {
					description:
						String(res?.meta?.response) ||
						"Could not connect with the provided SMTP credentials.",
				});
			}

			if (res?.meta?.receive !== undefined) {
				if (res?.meta.receive) {
					toast.success("IMAP connection verified", {
						description:
							"Incoming mail server is reachable and credentials are valid.",
					});
				} else {
					toast.error("IMAP verification failed", {
						description:
							String(res.meta?.response) ||
							"Could not connect with the provided IMAP credentials.",
					});
				}
			}

			if (!res?.ok) {
				toast.error("SMTP verification failed", {
					description:
						res?.message || "Verification failed due to an unknown error.",
				});
			}
		} catch (err: any) {
			toast.error("Verification error", {
				description: err?.message ?? "Unexpected error during SMTP/IMAP test.",
			});
		} finally {
			setTesting(false);
		}
	};

	return (
		<>
			<div
				className={cn(
					"col-span-12 md:col-span-6",
					"rounded-lg border text-brand-foreground p-5 bg-card border-border",
				)}
			>
				<div className="flex items-start justify-between gap-3">
					<div>
						<div className="text-base font-medium">
							{parsedVaultValues.label}
						</div>
						<div className="mt-1 text-sm  flex items-center gap-2">
							<span className="inline-flex items-center gap-1">
								<Lock className="h-3.5 w-3.5" />
								{parsedVaultValues.SMTP_HOST}:{parsedVaultValues.SMTP_PORT}
							</span>
							<span className="">•</span>
							<span className="inline-flex items-center gap-1">
								<ShieldCheck className="h-3.5 w-3.5" />
								{parsedVaultValues.SMTP_SECURE === "true" ? "TLS" : "STARTTLS"}
							</span>
						</div>
						<div className="mt-1 text-sm  flex items-center gap-2">
							{parsedVaultValues.IMAP_HOST && parsedVaultValues.IMAP_PORT && (
								<span className="inline-flex items-center gap-1">
									<Lock className="h-3.5 w-3.5" />
									{parsedVaultValues.IMAP_HOST}:{parsedVaultValues.IMAP_PORT}
								</span>
							)}
							{parsedVaultValues.IMAP_SECURE === "true" && (
								<span className="">•</span>
							)}
							{parsedVaultValues.IMAP_SECURE === "true" && (
								<span className="inline-flex items-center gap-1">
									<ShieldCheck className="h-3.5 w-3.5" />
									{parsedVaultValues.IMAP_SECURE === "true"
										? "TLS"
										: "STARTTLS"}
								</span>
							)}
						</div>
						<div className={"flex justify-start -mx-2 my-2"}>
							<IsVerifiedStatus
								verified={parsedVaultValues.sendVerified}
								statusName={"Outgoing"}
							/>
							<IsVerifiedStatus
								verified={parsedVaultValues.receiveVerified}
								statusName={"Incoming"}
							/>
						</div>
						<Button
							className={"my-2"}
							leftSection={<Play className="size-4" />}
							loading={testing}
							// onClick={() => initiateSMTPTest()} size={"xs"} variant={"filled"}>Verify Connection</Button>
							onClick={initiateVerifySMTP}
							size={"xs"}
							variant={"filled"}
						>
							Verify Connection
						</Button>
					</div>

					<div className="flex gap-2">
						<ActionIcon variant="filled" className="gap-1.5" onClick={openEdit}>
							<Pencil className="h-3 w-3" />
						</ActionIcon>
						<ActionIcon
							color="red"
							// loading={true}
							className="gap-1.5"
							onClick={confirmDelete}
						>
							<Trash2 className="h-3 w-3" />
						</ActionIcon>
					</div>
				</div>
			</div>
		</>
	);
}

export default SmtpAccountCard;
