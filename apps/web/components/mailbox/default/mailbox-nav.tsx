"use client";

import type { MailboxEntity } from "@db";
import {
	Archive,
	Ban,
	FileText,
	Folder,
	Inbox,
	Send,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MailboxColorPicker } from "./mailbox-color-picker";

type MailboxKind =
	| "inbox"
	| "sent"
	| "drafts"
	| "archive"
	| "spam"
	| "trash"
	| "outbox"
	| "custom";

export function MailboxNav({
	mailboxes,
	identityPublicId,
	onCreateLabel,
}: {
	mailboxes: MailboxEntity[];
	identityPublicId: string;
	onCreateLabel?: () => void;
}) {
	const pathname = usePathname();
	const params = useParams() as { mailboxSlug?: string };

	const systemOrder: MailboxKind[] = [
		"inbox",
		"starred" as any, // if you add later
		"drafts",
		"sent",
		"archive",
		"spam",
		"trash",
	].filter(Boolean) as MailboxKind[];

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

	const system = mailboxes
		.filter((m) => m.kind !== "custom")
		.filter((m) => m.kind !== "drafts")
		.sort((a, b) => systemOrder.indexOf(a.kind) - systemOrder.indexOf(b.kind));

	const custom = mailboxes.filter((m) => m.kind === "custom");

	const Item = ({ m }: { m: MailboxEntity }) => {
		const Icon = iconFor[m.kind] ?? Folder;
		const slug = m.slug ?? "inbox";
		const href = `/mail/${identityPublicId}/${slug}`;

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
				{m.color ? (
					<div
						className="h-2.5 w-2.5 shrink-0 rounded-full"
						style={{ backgroundColor: m.color }}
					/>
				) : null}
				<Icon className="h-4 w-4 shrink-0" />
				<span className="min-w-0 truncate">
					{m.kind === "custom" ? (m.name ?? "Label") : titleFor(m.kind)}
				</span>
				<span className="ml-auto">
					<MailboxColorPicker mailboxId={m.id} currentColor={m.color} />
				</span>
			</Link>
		);
	};

	return (
		<div className="space-y-4 px-2">
			<div className="space-y-1">
				{system.map((m) => (
					<Item key={m.slug ?? m.kind} m={m} />
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
