import {
	Activity,
	ArrowRight,
	CheckCircle2,
	Clock,
	Database,
	FileText,
	Globe,
	HardDrive,
	Mail,
	Plug,
	Send,
	ShieldCheck,
	Webhook,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@mantine/core";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { Container } from "@/components/common/containers";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { getWorkspacePublicId, getWorkspaceRole } from "@/lib/actions/clients";
import { fetchWorkspace } from "@/lib/actions/workspace";

export default async function Page() {
	const { data: statsData } = await getDashboardStats();
	const workspacePublicId = await getWorkspacePublicId();
	const workspaceRole = await getWorkspaceRole();
	const workspace = await fetchWorkspace();

	const isOwner = workspaceRole === "owner";
	const base = `/w/${workspacePublicId}/dashboard/platform`;

	const statCards = isOwner
		? [
			{
				icon: <Plug className="size-5 text-primary" />,
				label: "Connected Providers",
				value: statsData?.connectedProviders || 0,
				hint: "Sending and storage integrations",
			},
			{
				icon: <Send className="size-5 text-primary" />,
				label: "Active Identities",
				value: statsData?.activeIdentities || 0,
				hint: "Mailboxes and senders",
			},
			{
				icon: <Mail className="size-5 text-primary" />,
				label: "Messages Stored",
				value: statsData?.emailsProcessedTotal || 0,
				hint: `${statsData?.emailsProcessed24h || 0} in last 24h`,
			},
			{
				icon: <HardDrive className="size-5 text-primary" />,
				label: "Storage Used",
				value: formatBytes(
					statsData?.totalStorageBytes || statsData?.storageBytesUsed || 0,
				),
				hint: statsData?.isStorageOverLimit
					? "Over storage limit"
					: "Within plan limit",
			},
		]
		: [
			{
				icon: <Mail className="size-5 text-primary" />,
				label: "Messages",
				value: statsData?.emailsProcessedTotal || 0,
				hint: `${statsData?.emailsProcessed24h || 0} in last 24h`,
			},
			{
				icon: <FileText className="size-5 text-primary" />,
				label: "Threads",
				value: statsData?.threadCount || 0,
				hint: "Accessible conversations",
			},
			{
				icon: <Database className="size-5 text-primary" />,
				label: "Drafts",
				value: statsData?.draftCount || 0,
				hint: `${statsData?.scheduledDraftCount || 0} scheduled`,
			},
			{
				icon: <HardDrive className="size-5 text-primary" />,
				label: "Mail Storage",
				value: formatBytes(statsData?.rawMessageBytes || 0),
				hint: "Accessible stored mail",
			},
		];

	const setupItems = [
		{
			title: "Connect a provider",
			description: "Add SES, Postmark, SendGrid, Mailgun or SMTP.",
			done: Number(statsData?.connectedProviders || 0) > 0,
			href: `${base}/providers`,
		},
		{
			title: "Verify a domain",
			description: "Add DNS records and confirm ownership.",
			done: Number(statsData?.verifiedDomains || 0) > 0,
			href: `${base}/identities`,
		},
		{
			title: "Create an identity",
			description: "Create an email address for sending or receiving.",
			done: Number(statsData?.activeIdentities || 0) > 0,
			href: `${base}/identities`,
		},
		{
			title: "Create a storage volume",
			description: "Add a Drive volume for workspace files.",
			done: Number(statsData?.volumeCount || 0) > 0,
			href: `${base}/storage`,
		},
	];

	const quickActions = [
		{
			icon: <Plug className="size-4" />,
			title: "Providers",
			href: `${base}/providers`,
		},
		{
			icon: <Globe className="size-4" />,
			title: "Identities",
			href: `${base}/identities`,
		},
		{
			icon: <HardDrive className="size-4" />,
			title: "Storage",
			href: `${base}/storage`,
		},
		{
			icon: <Webhook className="size-4" />,
			title: "Webhooks",
			href: `${base}/webhooks`,
		},
		{
			icon: <ShieldCheck className="size-4" />,
			title: "Sync services",
			href: `${base}/sync-services`,
		},
	];

	return (
		<>
			<header className="flex h-16 shrink-0 items-center gap-2">
				<div className="flex items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-[orientation=vertical]:h-4"
					/>
				</div>
			</header>

			<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
				<Container variant="wide">
					<div className="space-y-6">
						<div className="rounded-2xl border bg-gradient-to-br from-muted/70 via-muted/30 to-background p-6">
							<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
								<div className="max-w-2xl">
									<div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
										<Activity className="size-3.5 text-primary" />
										Workspace overview
									</div>

									<h1 className="text-2xl font-semibold tracking-tight text-foreground">
										Welcome to{" "}
										<span className="capitalize">
											{workspace?.name || "Kurrier"}
										</span>
									</h1>

									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										{isOwner
											? "Track setup, mail volume, stored messages, Drive files and workspace storage from one place."
											: "Track your accessible mail, threads, drafts and stored messages from one place."}
									</p>
								</div>

								{isOwner ? (
									<div className="flex flex-wrap gap-3">
										<Link href={`${base}/providers`}>
											<Button>Add Provider</Button>
										</Link>

										<Link
											href={`${base}/identities`}
											className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted"
										>
											Create Identity
										</Link>
									</div>
								) : null}
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
							{statCards.map((card) => (
								<StatCard key={card.label} {...card} />
							))}
						</div>

						<div
							className={
								isOwner ? "grid gap-4 xl:grid-cols-[1fr_0.8fr]" : "grid gap-4"
							}
						>
							<Panel
								title="Mail flow"
								description={
									isOwner
										? "Workspace mail activity stored in Kurrier."
										: "Mail activity you can access in this workspace."
								}
							>
								<MetricGrid
									rows={[
										[
											"Total messages",
											formatNumber(statsData?.emailsProcessedTotal || 0),
										],
										[
											"Last 24h",
											formatNumber(statsData?.emailsProcessed24h || 0),
										],
										["Threads", formatNumber(statsData?.threadCount || 0)],
										["Drafts", formatNumber(statsData?.draftCount || 0)],
										[
											"Scheduled drafts",
											formatNumber(statsData?.scheduledDraftCount || 0),
										],
										[
											"Attachments",
											formatNumber(statsData?.attachmentCount || 0),
										],
									]}
								/>
							</Panel>

							{isOwner ? (
								<Panel
									title="Setup progress"
									description="Core steps for making this workspace useful."
								>
									<div className="space-y-3">
										{setupItems.map((item) => (
											<Link
												key={item.title}
												href={item.href}
												className="group flex items-start gap-3 rounded-xl border bg-muted/20 p-4 transition hover:bg-muted/40"
											>
												<div
													className={
														item.done
															? "mt-0.5 rounded-full bg-teal-500/10 p-1 text-teal-600"
															: "mt-0.5 rounded-full bg-amber-500/10 p-1 text-amber-500"
													}
												>
													{item.done ? (
														<CheckCircle2 className="size-4" />
													) : (
														<Clock className="size-4" />
													)}
												</div>

												<div className="min-w-0 flex-1">
													<div className="text-sm font-medium text-foreground">
														{item.title}
													</div>
													<div className="mt-1 text-xs text-muted-foreground">
														{item.description}
													</div>
												</div>

												<ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
											</Link>
										))}
									</div>
								</Panel>
							) : null}
						</div>

						<div
							className={
								isOwner ? "grid gap-4 xl:grid-cols-3" : "grid gap-4 xl:grid-cols-2"
							}
						>
							<MiniPanel
								icon={<Database className="size-4" />}
								title="Storage"
								rows={
									isOwner
										? [
											[
												"Raw EML",
												formatBytes(statsData?.rawMessageBytes || 0),
											],
											[
												"Attachments",
												formatBytes(statsData?.attachmentBytes || 0),
											],
											[
												"Drive files",
												formatBytes(statsData?.driveStorageBytes || 0),
											],
											[
												"Total",
												formatBytes(
													statsData?.totalStorageBytes ||
													statsData?.storageBytesUsed ||
													0,
												),
											],
										]
										: [
											[
												"Raw EML",
												formatBytes(statsData?.rawMessageBytes || 0),
											],
											[
												"Attachments",
												formatBytes(statsData?.attachmentBytes || 0),
											],
											[
												"Total",
												formatBytes(
													statsData?.totalStorageBytes ||
													statsData?.storageBytesUsed ||
													0,
												),
											],
										]
								}
							/>

							{isOwner ? (
								<MiniPanel
									icon={<Globe className="size-4" />}
									title="Configuration"
									rows={[
										[
											"Providers",
											formatNumber(statsData?.connectedProviders || 0),
										],
										[
											"Verified domains",
											formatNumber(statsData?.verifiedDomains || 0),
										],
										[
											"Identities",
											formatNumber(statsData?.activeIdentities || 0),
										],
										["Volumes", formatNumber(statsData?.volumeCount || 0)],
									]}
								/>
							) : null}

							<MiniPanel
								icon={<FileText className="size-4" />}
								title="Records"
								rows={
									isOwner
										? [
											[
												"Messages",
												formatNumber(statsData?.emailsProcessedTotal || 0),
											],
											[
												"Threads",
												formatNumber(statsData?.threadCount || 0),
											],
											[
												"Drafts",
												formatNumber(statsData?.draftCount || 0),
											],
											[
												"Drive entries",
												formatNumber(statsData?.driveEntryCount || 0),
											],
										]
										: [
											[
												"Messages",
												formatNumber(statsData?.emailsProcessedTotal || 0),
											],
											[
												"Threads",
												formatNumber(statsData?.threadCount || 0),
											],
											[
												"Drafts",
												formatNumber(statsData?.draftCount || 0),
											],
										]
								}
							/>
						</div>

						{isOwner ? (
							<div className="rounded-2xl border bg-card p-5">
								<div className="mb-5">
									<h2 className="text-base font-semibold text-foreground">
										Quick actions
									</h2>
									<p className="mt-1 text-sm text-muted-foreground">
										Common setup and workspace management tasks.
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
									{quickActions.map((action) => (
										<QuickAction key={action.title} {...action} />
									))}
								</div>
							</div>
						) : null}
					</div>
				</Container>
			</div>
		</>
	);
}

function StatCard({
					  icon,
					  label,
					  value,
					  hint,
				  }: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
	hint: string;
}) {
	return (
		<div className="rounded-2xl border bg-card p-4">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-muted-foreground">
					{label}
				</span>
				{icon}
			</div>
			<div className="mt-3 text-2xl font-semibold text-foreground">{value}</div>
			<div className="mt-1 text-xs text-muted-foreground">{hint}</div>
		</div>
	);
}

function Panel({
				   title,
				   description,
				   children,
			   }: {
	title: string;
	description: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border bg-card p-5">
			<div className="mb-5">
				<h2 className="text-base font-semibold text-foreground">{title}</h2>
				<p className="mt-1 text-sm text-muted-foreground">{description}</p>
			</div>
			{children}
		</div>
	);
}

function MetricGrid({ rows }: { rows: [string, string][] }) {
	return (
		<div className="grid gap-3 sm:grid-cols-2">
			{rows.map(([label, value]) => (
				<div key={label} className="rounded-xl border bg-muted/20 p-4">
					<div className="text-xs text-muted-foreground">{label}</div>
					<div className="mt-2 text-lg font-semibold text-foreground">
						{value}
					</div>
				</div>
			))}
		</div>
	);
}

function MiniPanel({
					   icon,
					   title,
					   rows,
				   }: {
	icon: React.ReactNode;
	title: string;
	rows: [string, string][];
}) {
	return (
		<div className="rounded-2xl border bg-card p-5">
			<div className="mb-4 flex items-center gap-2">
				<div className="rounded-lg border bg-background p-2 text-primary">
					{icon}
				</div>
				<h2 className="text-base font-semibold text-foreground">{title}</h2>
			</div>

			<div className="space-y-3">
				{rows.map(([label, value]) => (
					<div key={label} className="flex items-center justify-between gap-4">
						<span className="text-sm text-muted-foreground">{label}</span>
						<span className="text-sm font-medium text-foreground">{value}</span>
					</div>
				))}
			</div>
		</div>
	);
}

function QuickAction({
						 icon,
						 title,
						 href,
					 }: {
	icon: React.ReactNode;
	title: string;
	href: string;
}) {
	return (
		<Link
			href={href}
			className="group flex items-center justify-between rounded-xl border bg-muted/20 p-4 transition hover:bg-muted/40"
		>
			<div className="flex items-center gap-3">
				<div className="rounded-lg border bg-background p-2 text-primary">
					{icon}
				</div>
				<span className="text-sm font-medium text-foreground">{title}</span>
			</div>

			<ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5" />
		</Link>
	);
}

function formatNumber(value: unknown) {
	return Number(value || 0).toLocaleString();
}

function formatBytes(value: unknown) {
	const n = Number(value || 0);
	if (!Number.isFinite(n) || n <= 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"];
	let size = n;
	let unit = 0;

	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}

	const digits = unit === 0 ? 0 : size < 10 ? 1 : 0;
	return `${size.toFixed(digits)} ${units[unit]}`;
}
