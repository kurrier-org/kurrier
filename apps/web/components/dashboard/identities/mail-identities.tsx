"use client";

import * as React from "react";
import { Container } from "@/components/common/containers";
import { Card, CardContent } from "@/components/ui/card";
import { ActionIcon, Button, CopyButton, Tooltip } from "@mantine/core";
import {
	ArrowDownFromLine,
	ArrowUpFromLine,
	BadgeMinus,
	CheckCircle,
	Clock,
	Eye,
	Globe,
	Mail,
	Plus,
	RefreshCw,
	Trash2,
	Verified,
} from "lucide-react";
import { parseSecret } from "@/lib/utils";
import { modals } from "@mantine/modals";
import AddEmailIdentityForm from "@/components/dashboard/identities/add-email-identity-form";
import {
	deleteDomainIdentity,
	deleteEmailIdentity,
	FetchDecryptedSecretsResult,
	FetchUserIdentitiesResult,
	testSendingEmail,
	verifyDomainIdentity,
} from "@/lib/actions/dashboard";
import ProviderBadge from "@/components/dashboard/identities/provider-badge";
import IsVerifiedStatus from "@/components/dashboard/providers/is-verified-status";
import { IconCheck, IconCopy, IconSend } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import AddDomainIdentityForm from "@/components/dashboard/identities/add-domain-identity-form";
import { FormState, IdentityStatus, IdentityStatusMeta } from "@schema";
import EmailIdentityStatus from "@/components/dashboard/identities/email-identity-status";
import { DnsRecord } from "@providers";

function SectionHeader({
	title,
	count,
	action,
	subtitle,
}: {
	title: string;
	count?: number;
	subtitle?: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between">
			<div>
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
						{title}
					</h2>
					<span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
						{count ?? 0}
					</span>
				</div>
				{subtitle ? (
					<p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
				) : null}
			</div>
			{action ? <div className="ml-4">{action}</div> : null}
		</div>
	);
}

export default function MailIdentities({
	userIdentities,
	smtpAccounts,
	providerAccounts,
	providerOptions,
}: {
	userIdentities: FetchUserIdentitiesResult;
	smtpAccounts: FetchDecryptedSecretsResult;
	providerAccounts: FetchDecryptedSecretsResult;
	providerOptions: { label: string; value: string }[];
}) {
	const userEmailIdentities = useMemo(
		() => userIdentities.filter((i) => i.identities.kind === "email"),
		[userIdentities],
	);
	const userDomainIdentities = useMemo(
		() => userIdentities.filter((i) => i.identities.kind === "domain"),
		[userIdentities],
	);

	const [query, setQuery] = React.useState("");

	const initTestEmail = async (
		userIdentity: FetchUserIdentitiesResult[number],
		decryptedSecrets: Record<any, unknown>,
	) => {
		// setSendTesting(true);
		setSendingEmailId(userIdentity.identities.id);
		const res = await testSendingEmail(userIdentity, decryptedSecrets);
		if (res.success) {
			toast.success(res.message, {
				description: res.message,
			});
		} else {
			toast.error(res.error, {
				description: res.message,
			});
		}
		// setSendTesting(false);
		setSendingEmailId(null);
	};

	const openAddEmailForm = async () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					Add Email Identity
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-2">
					<AddEmailIdentityForm
						smtpAccounts={smtpAccounts}
						providerOptions={providerOptions}
						providerAccounts={providerAccounts}
						userDomainIdentities={userDomainIdentities}
						onCompleted={() => modals.close(openModalId)}
					/>
				</div>
			),
		});
	};

	const openAddDomainForm = async () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					Add Domain Identity
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-2">
					<AddDomainIdentityForm
						providerOptions={providerOptions}
						providerAccounts={providerAccounts}
						onCompleted={(res: FormState) => {
							modals.close(openModalId);
						}}
					/>
				</div>
			),
		});
	};

	const confirmDeleteIdentity = async (
		userIdentity: FetchUserIdentitiesResult[number],
	) => {
		modals.openConfirmModal({
			title: (
				<div className={"font-semibold text-brand-foreground"}>
					Delete Identity
				</div>
			),
			centered: true,
			children: (
				<div className="text-sm ">
					Are you sure you want to delete <b>{userIdentity.identities.value}</b>
					? This will remove the identity permanently and unlink any associated
					secrets.
				</div>
			),
			labels: { confirm: "Delete", cancel: "Cancel" },
			confirmProps: { color: "red" },
			onConfirm: async () => {
				const { success, message } = await deleteEmailIdentity(userIdentity);
				if (success) {
					toast.success(message);
				}
			},
		});
	};

	const confirmDeleteDomainIdentity = async (
		userDomainIdentity: FetchUserIdentitiesResult[number],
	) => {
		modals.openConfirmModal({
			title: (
				<div className={"font-semibold text-brand-foreground"}>
					Delete Identity
				</div>
			),
			centered: true,
			children: (
				<div className="text-sm ">
					Are you sure you want to delete{" "}
					<b>{userDomainIdentity.identities.value}</b>? This will remove the
					identity permanently and unlink any associated secrets.
				</div>
			),
			labels: { confirm: "Delete", cancel: "Cancel" },
			confirmProps: { color: "red" },
			onConfirm: async () => {
				const providerAccount = providerAccounts.find((acc) => {
					return (
						acc.linkRow.providerId === userDomainIdentity.identities.providerId
					);
				});
				const { error } = await deleteDomainIdentity(
					userDomainIdentity,
					providerAccount,
				);
				if (error) {
					toast.error("Failed to delete domain identity", {
						description: error,
					});
				} else {
					toast.success("Domain identity deleted");
				}
			},
		});
	};

	const openShowDNS = async (
		userDomainIdentity: FetchUserIdentitiesResult[number],
	) => {
		modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					DNS Records for <strong>{userDomainIdentity.identities.value}</strong>
				</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-4 rounded-xl bg-muted/40 border border-muted-foreground/20 space-y-3">
					{/*<h4 className="text-sm font-medium text-muted-foreground">DNS Records</h4>*/}
					<div className="space-y-2">
						{userDomainIdentity?.identities?.dnsRecords?.map(
							(record: DnsRecord, index: number) => (
								<div
									key={index}
									className="rounded-lg bg-background/70 border border-muted-foreground/20 p-3 text-xs font-mono space-y-1"
								>
									<div className="flex justify-between items-center">
										<span className="text-brand-foreground font-semibold">
											{record.type}
										</span>
										{record.ttl && (
											<span className="text-muted-foreground">
												TTL: {record.ttl}
											</span>
										)}
									</div>

									{/* Name row with copy */}
									<div className="flex items-center gap-2">
										<span className="text-muted-foreground">Name:</span>
										<code className="break-all">
											{record?.name
												? record?.name
												: userDomainIdentity.identities.value}
										</code>
										<CopyButton
											value={
												record?.name
													? record?.name
													: userDomainIdentity.identities.value
											}
											timeout={2000}
										>
											{({ copied, copy }) => (
												<Tooltip label={copied ? "Copied!" : "Copy"} withArrow>
													<ActionIcon
														color={copied ? "teal" : "gray"}
														onClick={copy}
														variant="subtle"
														size="sm"
													>
														{copied ? (
															<IconCheck size={14} />
														) : (
															<IconCopy size={14} />
														)}
													</ActionIcon>
												</Tooltip>
											)}
										</CopyButton>
									</div>

									{/* Value row with copy */}
									<div className="flex items-center gap-2">
										<span className="text-muted-foreground">Value:</span>
										<code className="break-all">{record.value}</code>
										<CopyButton value={record.value} timeout={1000}>
											{({ copied, copy }) => (
												<Tooltip label={copied ? "Copied!" : "Copy"} withArrow>
													<ActionIcon
														color={copied ? "teal" : "gray"}
														onClick={copy}
														variant="subtle"
														size="sm"
													>
														{copied ? (
															<IconCheck size={14} />
														) : (
															<IconCopy size={14} />
														)}
													</ActionIcon>
												</Tooltip>
											)}
										</CopyButton>
									</div>

									{record.priority && (
										<div>
											<span className="text-muted-foreground">Priority:</span>{" "}
											{record?.priority || "10"}
										</div>
									)}
								</div>
							),
						)}
					</div>
				</div>
			),
		});
	};

	const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
	const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(
		null,
	);

	return (
		<Container variant="wide">
			<div className="flex items-center justify-between my-4">
				<h1 className="text-xl font-bold text-foreground">Mail Identities</h1>
			</div>

			<p className="max-w-prose text-sm text-muted-foreground my-6">
				Manage domains and email addresses for sending across providers like
				Amazon SES, Postmark, SendGrid, and custom SMTP.
			</p>

			<Card className="shadow-none">
				<CardContent className="space-y-10">
					<div className="space-y-3">
						<SectionHeader
							title="Domains"
							count={userDomainIdentities.length}
							action={
								<Button
									onClick={openAddDomainForm}
									variant="outline"
									size="sm"
									className="gap-2"
									aria-label="Add domain"
								>
									<Plus className="size-4" />
									Add Domain
								</Button>
							}
						/>

						{userDomainIdentities.length === 0 ? (
							<EmptyState kind="domain" query={query} />
						) : (
							<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
								{userDomainIdentities.map((userDomainIdentity) => {
									const status = userDomainIdentity.identities
										.status as IdentityStatus;

									return (
										<div
											key={userDomainIdentity.identities.id}
											className="rounded-lg border mb-4 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="min-w-0">
												<div className="flex items-start gap-2 flex-wrap">
													<Globe className="mt-1 size-4 shrink-0 text-muted-foreground" />
													<div className="min-w-0">
														<div className="truncate font-semibold text-brand-foreground flex gap-4 flex-wrap">
															{userDomainIdentity.identities.value}
															{status === "verified" ? (
																<div
																	className={
																		"flex justify-center gap-1 items-center mx-2 text-teal-600 dark:text-brand-foreground font-medium text-xs"
																	}
																>
																	<Verified size={16} />
																	<span>
																		{
																			IdentityStatusMeta[
																				userDomainIdentity.identities
																					.status as IdentityStatus
																			].label
																		}
																	</span>

																	{userDomainIdentity.identities
																		.incomingDomain && (
																		<div className={"flex mx-2 gap-2"}>
																			<ArrowDownFromLine size={16} />
																			<span>Incoming</span>
																		</div>
																	)}

																	<ArrowUpFromLine size={16} />
																	<span>Outgoing</span>
																</div>
															) : (
																<div
																	className={
																		"flex justify-center gap-1 items-center mx-2 text-red-600 dark:text-brand-foreground font-medium text-xs"
																	}
																>
																	<BadgeMinus size={16} />
																	<span>
																		{
																			IdentityStatusMeta[
																				userDomainIdentity.identities
																					.status as IdentityStatus
																			].label
																		}
																	</span>
																</div>
															)}
														</div>

														<div className="mt-2 flex flex-wrap items-center gap-2">
															<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
																{status === "verified" ? (
																	<CheckCircle className="size-3.5" />
																) : (
																	<Clock className="size-3.5" />
																)}
																{
																	IdentityStatusMeta[
																		userDomainIdentity.identities
																			.status as IdentityStatus
																	].note
																}
															</span>
														</div>

														<div className="flex gap-2 sm:gap-3 w-full sm:w-auto my-2 flex-wrap">
															<Button
																leftSection={<RefreshCw className="size-4" />}
																size="xs"
																className="flex-1 sm:flex-none"
																loading={
																	verifyingDomainId ===
																	userDomainIdentity.identities.id
																}
																onClick={async () => {
																	setVerifyingDomainId(
																		userDomainIdentity.identities.id,
																	);
																	const providerAccount = providerAccounts.find(
																		(acc) => {
																			return (
																				acc.linkRow.providerId ===
																				userDomainIdentity.identities.providerId
																			);
																		},
																	);
																	const { data: response } =
																		await verifyDomainIdentity(
																			userDomainIdentity,
																			providerAccount,
																		);
																	if (response?.status === "verified") {
																		toast.success(
																			"Domain verified successfully",
																		);
																	} else {
																		toast.error("Domain verification failed", {
																			description:
																				"Please check your DNS records. If you've just added them, it may take some time for changes to propagate.",
																		});
																	}
																	setVerifyingDomainId(null);
																}}
															>
																Verify
															</Button>

															<Button
																leftSection={<Eye className="size-4" />}
																size="xs"
																className="flex-1 sm:flex-none"
																loading={
																	sendingEmailId ===
																	userDomainIdentity.identities.id
																}
																onClick={() => openShowDNS(userDomainIdentity)}
															>
																Show DNS Records
															</Button>

															<ActionIcon
																color="red"
																className="shrink-0"
																aria-label="Remove identity"
																onClick={() =>
																	confirmDeleteDomainIdentity(
																		userDomainIdentity,
																	)
																}
															>
																<Trash2 className="h-4 w-4" />
															</ActionIcon>
														</div>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					<div className="border-t" />

					<div className="space-y-3">
						<SectionHeader
							title="Email Addresses"
							count={userEmailIdentities.length}
							action={
								<Button
									onClick={openAddEmailForm}
									variant="outline"
									size="sm"
									className="gap-2"
									aria-label="Add email"
								>
									<Plus className="size-4" />
									Add Email
								</Button>
							}
						/>

						<div className="my-8">
							{userEmailIdentities.map((userIdentity) => {
								const providerType = userIdentity.smtp_accounts
									? "smtp"
									: (userIdentity?.providers?.type as string);

								let decrypted = {} as Record<string, any>;
								if (userIdentity?.providers?.id) {
									decrypted = parseSecret(
										providerAccounts.find(
											(s) =>
												s.linkRow.providerId === userIdentity?.providers?.id,
										),
									);
								} else if (userIdentity?.smtp_accounts?.id) {
									decrypted = parseSecret(
										smtpAccounts.find(
											(s) =>
												s.linkRow.accountId === userIdentity?.smtp_accounts?.id,
										),
									);
								}

								return (
									<div
										key={userIdentity.identities.id}
										className="rounded-lg border mb-4 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
									>
										{/* Left: identity + meta */}
										<div className="min-w-0">
											<div className="flex items-start gap-2">
												<Mail className="mt-1 size-4 shrink-0 text-muted-foreground" />
												<div className="min-w-0">
													<div className="truncate font-semibold text-brand-foreground">
														{userIdentity.identities.value}
													</div>

													<div className="mt-2 flex flex-wrap items-center gap-2">
														<ProviderBadge providerType={providerType} />
														{userIdentity.smtp_accounts ? (
															<>
																<IsVerifiedStatus
																	verified={!!decrypted.sendVerified}
																	statusName="Outgoing"
																/>
																<IsVerifiedStatus
																	verified={!!decrypted.receiveVerified}
																	statusName="Incoming"
																/>
															</>
														) : (
															<EmailIdentityStatus
																userIdentity={userIdentity}
															/>
														)}
													</div>
												</div>
											</div>
										</div>

										<div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
											<Button
												leftSection={<IconSend size={16} />}
												size="xs"
												className="flex-1 sm:flex-none"
												href={`/dashboard/mail/${userIdentity.identities.publicId}/inbox`}
												target={"_blank"}
												component="a"
											>
												Mailbox
											</Button>
											<Button
												leftSection={<IconSend size={16} />}
												size="xs"
												className="flex-1 sm:flex-none"
												loading={sendingEmailId === userIdentity.identities.id}
												onClick={() => initTestEmail(userIdentity, decrypted)}
											>
												Send Test Email
											</Button>

											<ActionIcon
												color="red"
												className="shrink-0"
												aria-label="Remove identity"
												onClick={() => confirmDeleteIdentity(userIdentity)}
											>
												<Trash2 className="h-4 w-4" />
											</ActionIcon>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</CardContent>
			</Card>
		</Container>
	);
}

function EmptyState({
	kind,
	query,
}: {
	kind: "domain" | "email";
	query: string;
}) {
	const searching = query.trim().length > 0;
	const label = kind === "domain" ? "domains" : "email addresses";
	return (
		<div className="rounded-lg border border-dashed p-6 text-center">
			<p className="text-sm text-muted-foreground">
				{searching ? (
					<>
						No {label} match{" "}
						<span className="font-medium text-foreground">“{query}”</span>. Try
						a different search.
					</>
				) : (
					<>No {label} yet — add your first one to get started.</>
				)}
			</p>
		</div>
	);
}
