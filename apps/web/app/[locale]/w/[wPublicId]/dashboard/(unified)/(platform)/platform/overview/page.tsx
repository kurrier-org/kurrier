import { Button } from "@mantine/core";
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
import type React from "react";
import { Container } from "@/components/common/containers";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getWorkspacePublicId, getWorkspaceRole } from "@/lib/actions/clients";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { fetchWorkspace } from "@/lib/actions/workspace";
import { getDictionary } from "@/lib/dictionaries";
import { SITE_FEATURES } from "@/lib/site-features";

export default async function Page({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const [
		{ data: statsData },
		workspacePublicId,
		workspaceRole,
		workspace,
		dict,
	] = await Promise.all([
		getDashboardStats(),
		getWorkspacePublicId(),
		getWorkspaceRole(),
		fetchWorkspace(),
		getDictionary(locale),
	]);
	const p = dict.platform;
	const driveEnabled = SITE_FEATURES.drive;

	const isOwner = workspaceRole === "owner";
	const base = `/w/${workspacePublicId}/dashboard/platform`;

	const statCards = isOwner
		? [
				{
					icon: <Plug className="size-5 text-primary" />,
					label: p.connectedProviders,
					value: statsData?.connectedProviders || 0,
					hint: driveEnabled
						? p.sendingAndStorageIntegrations
						: p.connectedIntegrations,
				},
				{
					icon: <Send className="size-5 text-primary" />,
					label: p.activeIdentities,
					value: statsData?.activeIdentities || 0,
					hint: p.mailboxesAndSenders,
				},
				{
					icon: <Mail className="size-5 text-primary" />,
					label: p.messagesStored,
					value: statsData?.emailsProcessedTotal || 0,
					hint: `${statsData?.emailsProcessed24h || 0} ${p.inLast24h}`,
				},
				{
					icon: <HardDrive className="size-5 text-primary" />,
					label: p.storageUsed,
					value: formatBytes(
						statsData?.totalStorageBytes || statsData?.storageBytesUsed || 0,
					),
					hint: statsData?.isStorageOverLimit
						? p.overStorageLimit
						: p.withinPlanLimit,
				},
			]
		: [
				{
					icon: <Mail className="size-5 text-primary" />,
					label: p.messages,
					value: statsData?.emailsProcessedTotal || 0,
					hint: `${statsData?.emailsProcessed24h || 0} ${p.inLast24h}`,
				},
				{
					icon: <FileText className="size-5 text-primary" />,
					label: p.threads,
					value: statsData?.threadCount || 0,
					hint: p.accessibleConversations,
				},
				{
					icon: <Database className="size-5 text-primary" />,
					label: p.drafts,
					value: statsData?.draftCount || 0,
					hint: `${statsData?.scheduledDraftCount || 0} ${p.scheduled}`,
				},
				{
					icon: <HardDrive className="size-5 text-primary" />,
					label: p.mailStorage,
					value: formatBytes(statsData?.rawMessageBytes || 0),
					hint: p.accessibleStoredMail,
				},
			];

	const setupItems = [
		{
			title: p.connectAProvider,
			description: p.connectAProviderDescription,
			done: Number(statsData?.connectedProviders || 0) > 0,
			href: `${base}/providers`,
		},
		{
			title: p.verifyADomain,
			description: p.verifyADomainDescription,
			done: Number(statsData?.verifiedDomains || 0) > 0,
			href: `${base}/identities`,
		},
		{
			title: p.createAnIdentity,
			description: p.createAnIdentityDescription,
			done: Number(statsData?.activeIdentities || 0) > 0,
			href: `${base}/identities`,
		},
	];
	if (driveEnabled) {
		setupItems.push({
			title: p.createAStorageVolume,
			description: p.createAStorageVolumeDescription,
			done: Number(statsData?.volumeCount || 0) > 0,
			href: `${base}/storage`,
		});
	}

	const quickActions = [
		{
			icon: <Plug className="size-4" />,
			title: p.providers,
			href: `${base}/providers`,
		},
		{
			icon: <Globe className="size-4" />,
			title: p.identities,
			href: `${base}/identities`,
		},
	];
	if (driveEnabled) {
		quickActions.push({
			icon: <HardDrive className="size-4" />,
			title: p.storage,
			href: `${base}/storage`,
		});
	}
	quickActions.push(
		{
			icon: <Webhook className="size-4" />,
			title: p.webhooks,
			href: `${base}/webhooks`,
		},
		{
			icon: <ShieldCheck className="size-4" />,
			title: p.syncServices,
			href: `${base}/sync-services`,
		},
	);
	const ownerStorageRows: [string, string][] = [
		[p.rawEml, formatBytes(statsData?.rawMessageBytes || 0)],
		[p.attachments, formatBytes(statsData?.attachmentBytes || 0)],
	];
	if (driveEnabled) {
		ownerStorageRows.push([
			p.driveFiles,
			formatBytes(statsData?.driveStorageBytes || 0),
		]);
	}
	ownerStorageRows.push([
		p.total,
		formatBytes(
			statsData?.totalStorageBytes || statsData?.storageBytesUsed || 0,
		),
	]);
	const ownerConfigurationRows: [string, string][] = [
		[p.providers, formatNumber(locale, statsData?.connectedProviders || 0)],
		[p.verifiedDomains, formatNumber(locale, statsData?.verifiedDomains || 0)],
		[p.identities, formatNumber(locale, statsData?.activeIdentities || 0)],
	];
	if (driveEnabled) {
		ownerConfigurationRows.push([
			p.volumes,
			formatNumber(locale, statsData?.volumeCount || 0),
		]);
	}
	const ownerRecordRows: [string, string][] = [
		[p.messages, formatNumber(locale, statsData?.emailsProcessedTotal || 0)],
		[p.threads, formatNumber(locale, statsData?.threadCount || 0)],
		[p.drafts, formatNumber(locale, statsData?.draftCount || 0)],
	];
	if (driveEnabled) {
		ownerRecordRows.push([
			p.driveEntries,
			formatNumber(locale, statsData?.driveEntryCount || 0),
		]);
	}

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
										{p.workspaceOverview}
									</div>

									<h1 className="text-2xl font-semibold tracking-tight text-foreground">
										{p.welcomeTo}{" "}
										<span className="capitalize">
											{workspace?.name || "Kurrier"}
										</span>
									</h1>

									<p className="mt-2 text-sm leading-6 text-muted-foreground">
										{isOwner
											? driveEnabled
												? p.ownerOverviewSubtitle
												: p.ownerMailOverviewSubtitle
											: p.memberOverviewSubtitle}
									</p>
								</div>

								{isOwner ? (
									<div className="grid w-full gap-3 lg:w-auto lg:grid-flow-col lg:auto-cols-max">
										<Link
											href={`${base}/providers`}
											className="block w-full lg:w-auto"
										>
											<Button className="!min-h-11 !w-full lg:!min-h-9 lg:!w-auto">
												{p.addProvider}
											</Button>
										</Link>

										<Link
											href={`${base}/identities`}
											className="block w-full lg:w-auto"
										>
											<Button
												variant="outline"
												className="!min-h-11 !w-full text-muted-foreground lg:!min-h-9 lg:!w-auto"
											>
												{p.createIdentity}
											</Button>
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
								title={p.mailFlow}
								description={
									isOwner
										? p.ownerMailFlowDescription
										: p.memberMailFlowDescription
								}
							>
								<MetricGrid
									rows={[
										[
											p.totalMessages,
											formatNumber(locale, statsData?.emailsProcessedTotal || 0),
										],
										[
											p.last24h,
											formatNumber(locale, statsData?.emailsProcessed24h || 0),
										],
										[p.threads, formatNumber(locale, statsData?.threadCount || 0)],
										[p.drafts, formatNumber(locale, statsData?.draftCount || 0)],
										[
											p.scheduledDrafts,
											formatNumber(locale, statsData?.scheduledDraftCount || 0),
										],
										[
											p.attachments,
											formatNumber(locale, statsData?.attachmentCount || 0),
										],
									]}
								/>
							</Panel>

							{isOwner ? (
								<Panel
									title={p.setupProgress}
									description={p.setupProgressDescription}
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
								isOwner
									? "grid gap-4 xl:grid-cols-3"
									: "grid gap-4 xl:grid-cols-2"
							}
						>
							<MiniPanel
								icon={<Database className="size-4" />}
								title={p.storage}
								rows={
									isOwner
										? ownerStorageRows
										: [
												[
													p.rawEml,
													formatBytes(statsData?.rawMessageBytes || 0),
												],
												[
													p.attachments,
													formatBytes(statsData?.attachmentBytes || 0),
												],
												[
													p.total,
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
									title={p.configuration}
									rows={ownerConfigurationRows}
								/>
							) : null}

							<MiniPanel
								icon={<FileText className="size-4" />}
								title={p.records}
								rows={
									isOwner
										? ownerRecordRows
										: [
												[
													p.messages,
													formatNumber(locale, statsData?.emailsProcessedTotal || 0),
												],
												[p.threads, formatNumber(locale, statsData?.threadCount || 0)],
												[p.drafts, formatNumber(locale, statsData?.draftCount || 0)],
											]
								}
							/>
						</div>

						{isOwner ? (
							<div className="rounded-2xl border bg-card p-5">
								<div className="mb-5">
									<h2 className="text-base font-semibold text-foreground">
										{p.quickActions}
									</h2>
									<p className="mt-1 text-sm text-muted-foreground">
										{p.quickActionsDescription}
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

function formatNumber(locale: string, value: unknown) {
	return Number(value || 0).toLocaleString(locale);
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
