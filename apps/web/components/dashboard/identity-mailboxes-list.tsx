"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
	Inbox,
	Send,
	FileText,
	Archive,
	Ban,
	Trash2,
	Folder,
	ChevronRight,
	ChevronDown,
	MoreVertical,
	Clock4,
} from "lucide-react";
import * as React from "react";
import {
	FetchIdentityMailboxListResult,
	FetchMailboxUnreadCountsResult,
} from "@/lib/actions/mailbox";
import { MailboxKind } from "@schema";
import {
	DraftMessageEntity,
	IdentityEntity,
	MailboxEntity,
	MailboxThreadEntity,
} from "@db";
import AddNewFolder from "@/components/mailbox/default/add-new-folder";
import { Menu } from "@mantine/core";
import DeleteMailboxFolder from "@/components/mailbox/default/delete-folder";
import { IconMailFast } from "@tabler/icons-react";

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

export default function IdentityMailboxesList({
	identityMailboxes,
	unreadCounts,
	scheduledDrafts,
	snoozedThreads,
	onComplete,
}: {
	identityMailboxes: FetchIdentityMailboxListResult;
	unreadCounts: FetchMailboxUnreadCountsResult;
	scheduledDrafts: DraftMessageEntity[];
	snoozedThreads: MailboxThreadEntity[];
	onComplete?: () => void;
}) {
	const pathname = usePathname();
	const params = useParams() as {
		identityPublicId?: string;
		mailboxSlug?: string;
	};
	const currentSlug = React.useMemo(() => {
		const parts = pathname.split("/").filter(Boolean);
		return parts.at(-1) ?? "inbox";
	}, [pathname]);

	const Item = ({
		m,
		identityPublicId,
		depth = 0,
		identity,
	}: {
		m: TreeMailbox;
		identityPublicId: string;
		depth?: number;
		identity: IdentityEntity;
	}) => {
		const Icon = ICON[m.kind] ?? Folder;
		const slug = m.slug ?? "inbox";
		const href = `/dashboard/mail/${identityPublicId}/${slug}`;
		const isActive =
			pathname === href ||
			(params.identityPublicId === identityPublicId && currentSlug === slug);

		const [open, setOpen] = React.useState(true);
		const hasChildren = m.children.length > 0;

		return (
			<div>
				<div className="flex items-center">
					{hasChildren ? (
						<button
							onClick={() => setOpen((v) => !v)}
							className="mr-1 rounded p-0.5 hover:bg-sidebar-accent/60"
							aria-label={open ? "Collapse" : "Expand"}
						>
							{open ? (
								<ChevronDown className="h-3.5 w-3.5" />
							) : (
								<ChevronRight className="h-3.5 w-3.5" />
							)}
						</button>
					) : (
						<span className="w-4" />
					)}

					<div className="flex w-full items-start">
						<Link
							href={href}
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
						>
							<Icon className="h-4 w-4 shrink-0" />
							<span className="truncate">
								{m.kind === "custom" ? (m.name ?? "Mailbox") : TITLE[m.kind]}
								{m.unread > 0 && <span> ({m.unread})</span>}
							</span>
						</Link>

						{m.kind === "custom" && (
							<Menu withinPortal position="right-start" offset={4}>
								<Menu.Target>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation(); // don’t toggle parent handlers
										}}
										className={cn(
											"rounded p-1 mt-1.25 transition",
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
								depth={depth + 1}
							/>
						))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="space-y-2 px-2">
			{identityMailboxes.map(({ identity, mailboxes }) => {
				const tree = buildTree(mailboxes as MailboxEntity[], unreadCounts);

				const scheduledCounts = scheduledDrafts.filter(
					(draft) => draft.identityId === identity.id,
				).length;
				const snoozedCounts = snoozedThreads.filter(
					(snoozed) => snoozed.identityId === identity.id,
				).length;
				return (
					<div key={identity.id}>
						<div className="px-1 mb-1 mt-2 text-xs font-semibold text-sidebar-foreground/60 flex items-center gap-1">
							<span>{identity.value}</span>
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
						{scheduledCounts > 0 && (
							<Link
								href={`/dashboard/mail/${params.identityPublicId}/scheduled`}
								className={`my-2 rounded hover:dark:bg-neutral-800 ${currentSlug === "scheduled" ? "dark:bg-neutral-800 dark:text-brand-foreground bg-brand-200 text-brand" : ""} flex justify-start gap-1 w-full p-1.5`}
							>
								<IconMailFast size={22} />
								<span className={"font-normal text-sm"}>
									Scheduled ({scheduledCounts})
								</span>
							</Link>
						)}

						{snoozedCounts > 0 && (
							<Link
								href={`/dashboard/mail/${params.identityPublicId}/snoozed`}
								className={`my-2 rounded hover:dark:bg-neutral-800 ${currentSlug === "snoozed" ? "dark:bg-neutral-800 dark:text-brand-foreground bg-brand-200 text-brand" : ""} flex justify-start gap-1 w-full p-1.5 items-center`}
							>
								<Clock4 size={16} />
								<span className={"font-normal text-sm"}>
									Snoozed ({snoozedThreads.length})
								</span>
							</Link>
						)}
					</div>
				);
			})}
		</div>
	);
}
