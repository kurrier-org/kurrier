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
	Plus,
} from "lucide-react";
import { IdentityEntity, MailboxEntity } from "@db";
import { FetchIdentityMailboxListResult } from "@/lib/actions/mailbox";
import { MailboxKind } from "@schema";

type Mailbox = {
	slug: string | null; // "inbox", "sent", ... or custom
	kind:
		| "inbox"
		| "sent"
		| "drafts"
		| "archive"
		| "spam"
		| "trash"
		| "outbox"
		| "custom";
	name?: string | null; // label for custom
	unreadCount?: number | null; // optional
};

export function UnifiedMailboxNav({
	// mailboxes,
	// identityPublicId,
	identityMailboxes,
	onCreateLabel,
}: {
	// mailboxes: MailboxEntity[];
	// identityPublicId: string;
	identityMailboxes: FetchIdentityMailboxListResult;
	onCreateLabel?: () => void;
}) {
	const pathname = usePathname();
	const params = useParams() as { mailboxSlug?: string };

	const unifiedMailboxes: {
		mailbox: MailboxEntity;
		identity: IdentityEntity;
	}[] = [];
	identityMailboxes.map(({ identity, mailboxes }) => {
		for (const m of mailboxes) {
			const isPresent = unifiedMailboxes.find((um) => {
				return um?.mailbox.name?.toLowerCase() === m?.name?.toLowerCase();
			});
			if (!isPresent) {
				unifiedMailboxes.push({
					mailbox: m,
					identity,
				});
			}
		}
	});

	const systemOrder: Mailbox["kind"][] = [
		"inbox",
		"drafts",
		"sent",
		"archive",
		"spam",
		"trash",
		"outbox",
	];

	const orderIndex = (k: Mailbox["kind"]) => {
		const i = systemOrder.indexOf(k);
		return i === -1 ? Number.MAX_SAFE_INTEGER : i;
	};

	const iconFor: Record<Mailbox["kind"], React.ElementType> = {
		inbox: Inbox,
		sent: Send,
		drafts: FileText,
		archive: Archive,
		spam: Ban,
		trash: Trash2,
		outbox: Send,
		custom: Folder,
	};

	const system = unifiedMailboxes
		.filter((m) => m.mailbox.kind !== "drafts")
		.sort((a, b) => {
			const ai = orderIndex(a.mailbox.kind);
			const bi = orderIndex(b.mailbox.kind);
			if (ai !== bi) return ai - bi;
			// tie-break: alphabetical for customs (same index)
			const an = (a.mailbox.name ?? a.mailbox.slug ?? "").toLowerCase();
			const bn = (b.mailbox.name ?? b.mailbox.slug ?? "").toLowerCase();
			return an.localeCompare(bn);
		});

	const Item = ({
		m,
	}: {
		m: { mailbox: MailboxEntity; identity: IdentityEntity };
	}) => {
		const Icon = iconFor[m.mailbox.kind as MailboxKind] ?? Folder;
		const slug = m.mailbox.slug ?? "inbox";
		const href = `/mail/${m.identity.publicId}/${slug}`;

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
					{m.mailbox.kind === "custom"
						? (m.mailbox.name ?? "Label")
						: titleFor(m.mailbox.kind)}
				</span>
				{/*{m.unreadCount ? (*/}
				{/*	<Badge*/}
				{/*		variant={isActive ? "secondary" : "outline"}*/}
				{/*		className="ml-auto"*/}
				{/*	>*/}
				{/*		{m.unreadCount}*/}
				{/*	</Badge>*/}
				{/*) : null}*/}
			</Link>
		);
	};

	return (
		<div className="space-y-4 px-2">
			{/* System folders */}
			<div className="space-y-1">
				{system.map((m) => (
					<Item key={m.mailbox.slug ?? m.mailbox.kind} m={m} />
				))}
			</div>
		</div>
	);
}

function titleFor(kind: Mailbox["kind"]) {
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
