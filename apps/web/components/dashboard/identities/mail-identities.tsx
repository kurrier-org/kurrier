// @ts-nocheck
"use client";

import * as React from "react";
import { Container } from "@/components/common/containers";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	ActionIcon,
	Button,
	CopyButton,
	SegmentedControl,
	Tooltip,
} from "@mantine/core";
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
import { cn, parseSecret } from "@/lib/utils";
import { useAppearance } from "@/components/providers/appearance-provider";
import { modals } from "@mantine/modals";
import { PROVIDER_CONFIG } from "@/components/dashboard/identities/PROVIDER_CONFIG";
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
import { FormState, IdentityStatusMeta, Providers } from "@schema";
import EmailIdentityStatus from "@/components/dashboard/identities/email-identity-status";
import { backfillAccount } from "@/lib/actions/mailbox";

export type Status = "verified" | "pending" | "failed";

export type DomainIdentity = {
	id: string;
	value: string;
	status: Status;
	providerHint?: Providers;
	note?: string;
};

export type EmailIdentity = {
	id: string;
	value: string;
	status: Status;
	providerHint?: Providers;
	default?: boolean;
};

const MOCK_DOMAINS: DomainIdentity[] = [
	{
		id: "d1",
		value: "news.acmeco.com",
		status: "pending",
		providerHint: "sendgrid",
		note: "Add TXT + CNAME records at your DNS host.",
	},
	{
		id: "d2",
		value: "acmeco.com",
		status: "verified",
		providerHint: "ses",
		note: "All emails under this domain can be used.",
	},
];

const MOCK_EMAILS: EmailIdentity[] = [
	{
		id: "e1",
		value: "support@acmeco.com",
		status: "verified",
		providerHint: "ses",
		default: true,
	},
	{
		id: "e2",
		value: "billing@acmeco.com",
		status: "failed",
		providerHint: "smtp",
	},
];

/* Header block (title + helper + actions) */
function PageHeader() {
	return (
		<div className="mb-4 mt-2">
			<h1 className="text-xl font-bold tracking-tight text-foreground">
				Mail Identities
			</h1>
			<p className="mt-2 text-sm text-muted-foreground max-w-prose">
				Manage domains and email addresses for sending across providers like
				Amazon SES, Postmark, SendGrid, and custom SMTP.
			</p>
		</div>
	);
}

/* Section header */
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
	const [tab, setTab] = React.useState<"all" | "email" | "domain">("all");

	const [domains, setDomains] = React.useState(MOCK_DOMAINS);
	const [emails, setEmails] = React.useState(MOCK_EMAILS);

	const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
	const [retryingId, setRetryingId] = React.useState<string | null>(null);

	const { theme } = useAppearance();

	const segmentedData = [
		{ label: "All", value: "all" },
		{ label: "Email", value: "email" },
		{ label: "Domain", value: "domain" },
	];

	const filteredDomains = React.useMemo(() => {
		let out = domains;
		if (query.trim()) {
			const q = query.toLowerCase();
			out = out.filter(
				(d) =>
					d.value.toLowerCase().includes(q) ||
					(d.providerHint
						? PROVIDER_CONFIG[d.providerHint].name.toLowerCase().includes(q)
						: false),
			);
		}
		if (tab === "domain" || tab === "all") return out;
		return [];
	}, [domains, query, tab]);

	const filteredEmails = React.useMemo(() => {
		let out = emails;
		if (query.trim()) {
			const q = query.toLowerCase();
			out = out.filter(
				(e) =>
					e.value.toLowerCase().includes(q) ||
					(e.providerHint
						? PROVIDER_CONFIG[e.providerHint].name.toLowerCase().includes(q)
						: false),
			);
		}
		if (tab === "email" || tab === "all") return out;
		return [];
	}, [emails, query, tab]);

	// ---- Actions (mocked) ----
	const verifyDomain = async (id: string) => {
		setVerifyingId(id);
		try {
			await new Promise((r) => setTimeout(r, 900));
			setDomains((prev) =>
				prev.map((d) => (d.id === id ? { ...d, status: "verified" } : d)),
			);
		} finally {
			setVerifyingId(null);
		}
	};

	const retryEmail = async (id: string) => {
		setRetryingId(id);
		try {
			await new Promise((r) => setTimeout(r, 900));
			setEmails((prev) =>
				prev.map((e) => (e.id === id ? { ...e, status: "verified" } : e)),
			);
		} finally {
			setRetryingId(null);
		}
	};

	const makeDefault = (id: string) => {
		setEmails((prev) => prev.map((e) => ({ ...e, default: e.id === id })));
	};

	const removeEmail = (id: string) =>
		setEmails((prev) => prev.filter((e) => e.id !== id));

	const [sendTesting, setSendTesting] = useState(false);

	const initTestEmail = async (
		userIdentity: FetchUserIdentitiesResult[number],
		decryptedSecrets: Record<any, unknown>,
	) => {
		setSendTesting(true);
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
		setSendTesting(false);
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
							console.log("AddDomainIdentityForm onCompleted", res);
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
							(record, index) => (
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
										<code className="break-all">{record.name}</code>
										<CopyButton value={record.name} timeout={2000}>
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

									{/*{record.priority && (*/}
									{/*    <div>*/}
									{/*        <span className="text-muted-foreground">Priority:</span>{" "}*/}
									{/*        {record.priority}*/}
									{/*    </div>*/}
									{/*)}*/}
								</div>
							),
						)}
					</div>
				</div>
			),
		});
	};

	const [verifyingDomainIdentity, setVerifyingDomainIdentity] = useState(false);


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
				<CardHeader className="gap-5">
					<div className="flex flex-col gap-3">
						<SegmentedControl
							value={tab}
							onChange={(v) => setTab(v as typeof tab)}
							data={segmentedData}
							size="sm"
							color={theme}
							fullWidth
							aria-label="Filter identities"
						/>

						<div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="grid w-full max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
								<input
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Search identities or providers…"
									className={cn(
										"h-9 w-full rounded-md border bg-background px-3 text-sm outline-none",
										"focus-visible:ring-2 focus-visible:ring-ring",
									)}
									aria-label="Search identities"
								/>
								<div className="flex gap-2">
									<Button
										className="w-full gap-2 sm:w-auto"
										aria-label="Add identity"
									>
										<Plus className="size-4" />
										Add Identity
									</Button>
								</div>
							</div>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-10">
					{/* Domains */}
					<div className="space-y-3">
						<SectionHeader
							title="Domains"
							// count={filteredDomains.length}
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
						{/*{filteredDomains.length === 0 ? (*/}
						{/*    <EmptyState kind="domain" query={query} />*/}
						{/*) : (*/}
						{/*    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">*/}
						{/*        {filteredDomains.map((d) => (*/}
						{/*            <DomainCard*/}
						{/*                key={d.id}*/}
						{/*                d={d}*/}
						{/*                onVerify={verifyDomain}*/}
						{/*                verifying={verifyingId === d.id}*/}
						{/*            />*/}
						{/*        ))}*/}
						{/*    </div>*/}
						{/*)}*/}

						{userDomainIdentities.length === 0 ? (
							<EmptyState kind="domain" query={query} />
						) : (
							<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
								{userDomainIdentities.map((userDomainIdentity) => {
									// const decrypted = parseSecret(smtpAccounts.find((s) => s.linkRow.accountId === userIdentity?.smtp_accounts?.id));
									// const providerType =
									//     userIdentity.smtp_accounts ? "smtp" : (userIdentity?.providers?.type as string);

									return (
										<div
											key={userDomainIdentity.identities.id}
											className="rounded-lg border mb-4 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
										>
											{/* Left: identity + meta */}
											<div className="min-w-0">
												<div className="flex items-start gap-2">
													<Globe className="mt-1 size-4 shrink-0 text-muted-foreground" />
													<div className="min-w-0">
														<div className="truncate font-semibold text-brand-foreground flex gap-4">
															{userDomainIdentity.identities.value}
															{userDomainIdentity.identities.status ===
															"verified" ? (
																<div
																	className={
																		"flex justify-center gap-1 items-center mx-2 text-teal-600 dark:text-brand-foreground font-medium text-xs"
																	}
																>
																	<Verified size={16} />
																	<span>
																		{
																			IdentityStatusMeta[
																				userDomainIdentity.identities.status
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
																				userDomainIdentity.identities.status
																			].label
																		}
																	</span>
																</div>
															)}
														</div>

														<div className="mt-2 flex flex-wrap items-center gap-2">
															<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
																{userDomainIdentity.identities.status ===
																"verified" ? (
																	<CheckCircle className="size-3.5" />
																) : (
																	<Clock className="size-3.5" />
																)}
																{
																	IdentityStatusMeta[
																		userDomainIdentity.identities.status
																	].note
																}
															</span>

															{/*<Badge className={"bg-amber-100 text-amber-900 dark:bg-amber-300/20 dark:text-amber-200"}>*/}
															{/*    <Clock className="size-3.5" />*/}
															{/*    Pending DNS*/}
															{/*</Badge>*/}
															{/*<ProviderBadge providerType={providerType} />*/}
															{/*<IsVerifiedStatus verified={!!decrypted.sendVerified} statusName="Outgoing" />*/}
															{/*<IsVerifiedStatus verified={!!decrypted.receiveVerified} statusName="Incoming" />*/}
														</div>

														<div className="flex gap-2 sm:gap-3 w-full sm:w-auto my-2">
															<Button
																leftSection={<RefreshCw className="size-4" />}
																size="xs"
																className="flex-1 sm:flex-none"
																loading={verifyingDomainIdentity}
																// onClick={() => initTestEmail(userIdentity, decrypted)}
																onClick={async () => {
																	setVerifyingDomainIdentity(true);
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
																	setVerifyingDomainIdentity(false);
																}}
															>
																Verify
															</Button>

															<Button
																leftSection={<Eye className="size-4" />}
																size="xs"
																className="flex-1 sm:flex-none"
																loading={sendTesting}
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

											{/* Right: actions */}
											{/*<div className="flex gap-2 sm:gap-3 w-full sm:w-auto">*/}
											{/*    <Button*/}
											{/*        leftSection={<IconSend size={16} />}*/}
											{/*        size="xs"*/}
											{/*        className="flex-1 sm:flex-none"*/}
											{/*        loading={sendTesting}*/}
											{/*        onClick={() => initTestEmail(userIdentity, decrypted)}*/}
											{/*    >*/}
											{/*        Send Test Email*/}
											{/*    </Button>*/}

											{/*    <ActionIcon*/}
											{/*        color="red"*/}
											{/*        className="shrink-0"*/}
											{/*        aria-label="Remove identity"*/}
											{/*        onClick={() => confirmDeleteIdentity(userIdentity)}*/}
											{/*    >*/}
											{/*        <Trash2 className="h-4 w-4" />*/}
											{/*    </ActionIcon>*/}
											{/*</div>*/}
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Divider rhythm */}
					<div className="border-t" />

					{/* Emails */}
					<div className="space-y-3">
						<SectionHeader
							title="Email Addresses"
							// count={filteredEmails.length}
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

										{/* Right: actions */}
										<div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
											<button
												onClick={() =>
													backfillAccount(userIdentity.identities.id)
												}
											>
												trigger
											</button>
											<Button
												leftSection={<IconSend size={16} />}
												size="xs"
												className="flex-1 sm:flex-none"
												loading={sendTesting}
												href={`/mail/${userIdentity.identities.publicId}/inbox`}
												target={"_blank"}
												component="a"
												// onClick={() => initTestEmail(userIdentity, decrypted)}
											>
												Mailbox
											</Button>
											<Button
												leftSection={<IconSend size={16} />}
												size="xs"
												className="flex-1 sm:flex-none"
												loading={sendTesting}
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

// /mail/<mailboxId>/inbox
