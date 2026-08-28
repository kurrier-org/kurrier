"use client";

import type {
	DraftMessageEntity,
	IdentityEntity,
	MailboxEntity,
	MailboxThreadEntity,
} from "@db";
import { Menu, Select } from "@mantine/core";
import type { MailboxKind } from "@schema";
import { IconMailFast } from "@tabler/icons-react";
import {
	Archive,
	Ban,
	ChevronDown,
	ChevronRight,
	Clock4,
	FileText,
	Folder,
	Inbox,
	MoreVertical,
	Send,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { Suspense, use } from "react";
import AddNewFolder from "@/components/mailbox/default/add-new-folder";
import DeleteMailboxFolder from "@/components/mailbox/default/delete-folder";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { useDashboardPath } from "@/hooks/use-dashboard-path";
import type {
	FetchIdentityMailboxListResult,
	FetchMailboxUnreadCountsResult,
} from "@/lib/actions/mailbox";
import { cn } from "@/lib/utils";

const ORDER: MailboxKind[] = [
	"inbox",
	"drafts",
	"sent",
	"archive",
	"spam",
	"trash",
	"outbox",
	"custom",
];

const ICON: Record<MailboxKind, React.ElementType> = {
	inbox: Inbox,
	sent: Send,
	drafts: FileText,
	archive: Archive,
	spam: Ban,
	trash: Trash2,
	outbox: Send,
	custom: Folder,
};

const TITLE: Record<MailboxKind, string> = {
	inbox: "Inbox",
	sent: "Sent",
	drafts: "Drafts",
	archive: "Archive",
	spam: "Spam",
	trash: "Trash",
	outbox: "Outbox",
	custom: "Mailbox",
};

type TreeMailbox = {
	id: string;
	name: string | null;
	kind: MailboxKind;
	slug: string | null;
	parentId: string | null;
	selectable: boolean;
	unread: number;
	children: TreeMailbox[];
};

function buildTree(
	rows: MailboxEntity[],
	unreadCounts: FetchMailboxUnreadCountsResult,
): TreeMailbox[] {
	const byId = new Map<string, TreeMailbox>();
	const roots: TreeMailbox[] = [];

	for (const r of rows) {
		byId.set(r.id, {
			id: r.id,
			name: r.name ?? null,
			kind: r.kind as MailboxKind,
			slug: r.slug ?? null,
			parentId: (r as any).parentId ?? null,
			selectable: (r.metaData as any)?.imap?.selectable !== false,
			unread: unreadCounts.get(r.id)?.unreadTotal ?? 0,
			children: [],
		});
	}

	for (const node of byId.values()) {
		if (node.parentId && byId.has(node.parentId)) {
			byId.get(node.parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	}

	const sortRec = (arr: TreeMailbox[]) => {
		arr.sort(
			(a, b) =>
				(ORDER.indexOf(a.kind) ?? 999) - (ORDER.indexOf(b.kind) ?? 999) ||
				(a.name ?? "").localeCompare(b.name ?? ""),
		);
		for (const c of arr) if (c.children.length) sortRec(c.children);
	};
	sortRec(roots);

	return roots;
}

function IdentityExtraCounts({
	identity,
	scheduledDraftsPromise,
	snoozedThreadsPromise,
	dashboardPath,
	currentSlug,
}: {
	identity: IdentityEntity;
	scheduledDraftsPromise: Promise<DraftMessageEntity[]>;
	snoozedThreadsPromise: Promise<{ threads: MailboxThreadEntity[] }>;
	dashboardPath: (path: string) => string;
	currentSlug: string;
}) {
	const scheduledDrafts = use(scheduledDraftsPromise);
	const { threads: snoozedThreads } = use(snoozedThreadsPromise);

	const scheduledCount = scheduledDrafts.filter(
		(d) => d.identityId === identity.id,
	).length;

	const snoozedCount = snoozedThreads.filter(
		(s) => s.identityId === identity.id,
	).length;

	return (
		<>
			{scheduledCount > 0 && (
				<Link
					href={dashboardPath(`mail/${identity.publicId}/scheduled`)}
					className={`my-2 rounded hover:dark:bg-neutral-800 ${
						currentSlug === "scheduled"
							? "dark:bg-neutral-800 dark:text-brand-foreground bg-brand-200 text-brand"
							: ""
					} flex justify-start gap-1 w-full p-1.5`}
				>
					<IconMailFast size={22} />
					<span className="font-normal text-sm">
						Scheduled ({scheduledCount})
					</span>
				</Link>
			)}

			{snoozedCount > 0 && (
				<Link
					href={dashboardPath(`mail/${identity.publicId}/snoozed`)}
					className={`mx-1.5 my-2 rounded hover:dark:bg-neutral-800 ${
						currentSlug === "snoozed"
							? "dark:bg-neutral-800 dark:text-brand-foreground bg-brand-200 text-brand"
							: ""
					} flex justify-start gap-1 w-full p-1.5 items-center`}
				>
					<Clock4 size={16} />
					<span className="font-normal text-sm">Snoozed ({snoozedCount})</span>
				</Link>
			)}
		</>
	);
}

export default function IdentityMailboxesList({
	identityMailboxes,
	unreadCounts,
	scheduledDraftsPromise,
	snoozedThreadsPromise,
	workspacePublicId,
	onComplete,
}: {
	identityMailboxes: FetchIdentityMailboxListResult;
	unreadCounts: FetchMailboxUnreadCountsResult;
	scheduledDraftsPromise: Promise<DraftMessageEntity[]>;
	snoozedThreadsPromise: Promise<{ threads: MailboxThreadEntity[] }>;
	workspacePublicId: string | undefined;
	onComplete?: () => void;
}) {
	const dict = useOptionalDictionary();
	const pathname = usePathname();
	const params = useParams() as {
		identityPublicId?: string;
		mailboxSlug?: string;
	};
	const dashboardPath = useDashboardPath(workspacePublicId);

	const currentSlug = React.useMemo(() => {
		const parts = pathname.split("/").filter(Boolean);
		return parts.at(-1) ?? "inbox";
	}, [pathname]);

	const router = useRouter();

	const Item = ({
		m,
		identityPublicId,
		identity,
		level = 0,
	}: {
		m: TreeMailbox;
		identityPublicId: string;
		identity: IdentityEntity;
		level?: number;
	}) => {
		const Icon = ICON[m.kind] ?? Folder;
		const slug = m.slug ?? "inbox";
		const itemLabel =
			m.kind === "custom" ? (m.name ?? "Mailbox") : TITLE[m.kind];
		const href = dashboardPath(`mail/${identityPublicId}/${slug}`);

		const isActive =
			pathname === href ||
			(params.identityPublicId === identityPublicId && currentSlug === slug);

		const [open, setOpen] = React.useState(true);
		const hasChildren = m.children.length > 0;

		return (
			<div className="min-w-0">
				<div className="flex min-w-0 items-center gap-1">
					{hasChildren ? (
						<button
							type="button"
							onClick={() => setOpen((v) => !v)}
							className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-sidebar-accent/60"
							aria-label={open ? "Collapse" : "Expand"}
						>
							{open ? (
								<ChevronDown className="h-3.5 w-3.5" />
							) : (
								<ChevronRight className="h-3.5 w-3.5" />
							)}
						</button>
					) : (
						<span className="w-6 shrink-0" />
					)}

					<div className="flex min-w-0 flex-1 items-start gap-1">
						<Link
							href={href}
							title={itemLabel}
							onClick={onComplete ? () => onComplete() : undefined}
							aria-disabled={!m.selectable}
							className={cn(
								"flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pl-2 text-sm",
								"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
								isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
								isActive
									? "text-brand dark:text-white bg-brand-100 dark:bg-neutral-800 hover:text-brand hover:bg-brand-100"
									: "",
								!m.selectable &&
									"opacity-60 pointer-events-none cursor-default",
							)}
							style={{ paddingLeft: 8 + level * 8 }}
						>
							<Icon className="h-4 w-4 shrink-0" />
							<span className="min-w-0 truncate">
								{itemLabel}
								{m.unread > 0 && <span> ({m.unread})</span>}
							</span>
						</Link>

						{m.kind === "custom" && (
							<Menu withinPortal position="right-start" offset={4}>
								<Menu.Target>
									<button
										type="button"
										onClick={(e) => e.stopPropagation()}
										className={cn(
											"mt-1 flex size-7 shrink-0 items-center justify-center rounded transition",
											"hover:bg-sidebar-accent/60",
										)}
										aria-label={`Actions for ${m.name ?? "folder"}`}
									>
										<MoreVertical className="h-4 w-4" />
									</button>
								</Menu.Target>

								<Menu.Dropdown onClick={(e) => e.stopPropagation()}>
									<DeleteMailboxFolder
										mailboxId={m.id}
										identityPublicId={identityPublicId}
										imapOp={!!identity.smtpAccountId}
									/>
								</Menu.Dropdown>
							</Menu>
						)}
					</div>
				</div>

				{open && hasChildren && (
					<div>
						{m.children.map((child) => (
							<Item
								key={child.id}
								m={child}
								identityPublicId={identityPublicId}
								identity={identity}
								level={level + 1}
							/>
						))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="min-w-0 space-y-2 px-3 pb-4">
			<div className="my-2 min-w-0">
				<Select
					className="min-w-0"
					placeholder={dict?.common?.pickValue ?? "Pick value"}
					size="sm"
					allowDeselect={false}
					withCheckIcon={false}
					styles={{
						input: {
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						},
					}}
					onChange={(publicId) => {
						router.push(dashboardPath(`mail/${publicId}/inbox`));
					}}
					value={params.identityPublicId}
					data={identityMailboxes.map((id) => {
						return { value: id.identity.publicId, label: id.identity.value };
					})}
				/>
			</div>

			{identityMailboxes.map(({ identity, mailboxes }) => {
				const tree = buildTree(mailboxes as MailboxEntity[], unreadCounts);

				return (
					<div key={identity.id} className="min-w-0">
						<div className="mb-1 mt-3 flex min-w-0 items-center gap-2 px-1 text-xs font-semibold text-sidebar-foreground/60">
							<span className="min-w-0 flex-1 truncate" title={identity.value}>
								{identity.value}
							</span>
							<AddNewFolder mailboxes={mailboxes} identity={identity} />
						</div>

						<div className="space-y-1">
							{tree.map((m) => (
								<Item
									key={`${identity.id}:${m.id}`}
									m={m}
									identityPublicId={identity.publicId}
									identity={identity}
								/>
							))}
						</div>

						<Suspense fallback={null}>
							<IdentityExtraCounts
								identity={identity}
								scheduledDraftsPromise={scheduledDraftsPromise}
								snoozedThreadsPromise={snoozedThreadsPromise}
								dashboardPath={dashboardPath}
								currentSlug={currentSlug}
							/>
						</Suspense>
					</div>
				);
			})}
		</div>
	);
}
