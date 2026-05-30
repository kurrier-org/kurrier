"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Inbox, Send, FileText, Archive, Ban, Trash2, Folder } from "lucide-react";
import { IdentityEntity, MailboxEntity } from "@db";
import { FetchIdentityMailboxListResult } from "@/lib/actions/mailbox";
import { MailboxKind } from "@schema";

type Mailbox = MailboxEntity & {
	unreadCount?: number | null;
	unreadThreads?: number | null;
};

const systemOrder: MailboxKind[] = [
	"inbox",
	"drafts",
	"sent",
	"archive",
	"spam",
	"trash",
	"outbox",
];

const orderIndex = (kind: MailboxKind) => {
	const index = systemOrder.indexOf(kind);
	return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};

const iconFor: Record<MailboxKind, React.ElementType> = {
	inbox: Inbox,
	sent: Send,
	drafts: FileText,
	archive: Archive,
	spam: Ban,
	trash: Trash2,
	outbox: Send,
	custom: Folder,
};

export function UnifiedMailboxNav({
	identityMailboxes,
}: {
	identityMailboxes: FetchIdentityMailboxListResult;
	onCreateLabel?: () => void;
}) {
	const pathname = usePathname();
	const params = useParams() as { mailboxSlug?: string };

	const unifiedMailboxes: {
		mailbox: Mailbox;
		identity: IdentityEntity;
		unreadCount: number;
	}[] = [];

	for (const { identity, mailboxes } of identityMailboxes) {
		for (const mailbox of mailboxes as Mailbox[]) {
			const existing = unifiedMailboxes.find(
				(item) => item.mailbox.kind === mailbox.kind && item.mailbox.name?.toLowerCase() === mailbox.name?.toLowerCase(),
			);
			if (existing) {
				existing.unreadCount += Number(mailbox.unreadCount ?? 0);
				continue;
			}
			unifiedMailboxes.push({
				mailbox,
				identity,
				unreadCount: Number(mailbox.unreadCount ?? 0),
			});
		}
	}

	const sortedMailboxes = unifiedMailboxes.sort((a, b) => {
		const ai = orderIndex(a.mailbox.kind as MailboxKind);
		const bi = orderIndex(b.mailbox.kind as MailboxKind);
		if (ai !== bi) return ai - bi;
		const an = (a.mailbox.name ?? a.mailbox.slug ?? "").toLowerCase();
		const bn = (b.mailbox.name ?? b.mailbox.slug ?? "").toLowerCase();
		return an.localeCompare(bn);
	});

	const Item = ({
		item,
	}: {
		item: { mailbox: Mailbox; identity: IdentityEntity; unreadCount: number };
	}) => {
		const Icon = iconFor[item.mailbox.kind as MailboxKind] ?? Folder;
		const slug = item.mailbox.slug ?? "inbox";
		const href = `/dashboard/mail/${item.identity.publicId}/${slug}`;

		const isActive =
			pathname === href || (params.mailboxSlug == null && slug === "inbox");

		return (
			<Link
				href={href}
				className={cn(
					"group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
					"hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
					isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
				)}
			>
				<Icon className="h-4 w-4 shrink-0" />
				<span className="min-w-0 truncate">
					{item.mailbox.kind === "custom"
						? (item.mailbox.name ?? "Folder")
						: titleFor(item.mailbox.kind)}
				</span>
				{item.unreadCount > 0 ? (
					<Badge variant={isActive ? "secondary" : "outline"} className="ml-auto">
						{item.unreadCount}
					</Badge>
				) : null}
			</Link>
		);
	};

	return (
		<div className="space-y-4 px-2">
			<div className="space-y-1">
				{sortedMailboxes.map((item) => (
					<Item key={`${item.identity.id}:${item.mailbox.id}`} item={item} />
				))}
			</div>
		</div>
	);
}

function titleFor(kind: MailboxKind) {
	switch (kind) {
		case "inbox":
			return "Inbox";
		case "sent":
			return "Sent";
		case "drafts":
			return "Drafts";
		case "archive":
			return "Archive";
		case "spam":
			return "Spam";
		case "trash":
			return "Trash";
		case "outbox":
			return "Outbox";
		default:
			return "Mailbox";
	}
}
