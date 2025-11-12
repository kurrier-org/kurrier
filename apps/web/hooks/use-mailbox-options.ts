import * as React from "react";
import { FetchIdentityMailboxListResult } from "@/lib/actions/mailbox";

type OptionItem = { label: string; value: string; disabled?: boolean };
type OptionGroup = { group: string; items: OptionItem[] };

type RowMailbox = FetchIdentityMailboxListResult[number]["mailboxes"][number];

type Node = {
	id: string;
	parentId: string | null;
	name: string;
	children: string[];
};

function buildMailboxTree(list: RowMailbox[]) {
	const byId = new Map<string, Node>();

	for (const m of list) {
		byId.set(m.id, {
			id: m.id,
			parentId: m.parentId ?? null,
			name: (m.name ?? "").trim(),
			children: [],
		});
	}

	const roots: string[] = [];
	for (const m of list) {
		const id = m.id;
		const pid = m.parentId ?? null;
		if (pid && byId.has(pid)) byId.get(pid)!.children.push(id);
		else roots.push(id);
	}

	return { byId, roots };
}

function flatten(tree: ReturnType<typeof buildMailboxTree>) {
	const { byId, roots } = tree;
	const out: OptionItem[] = [];

	const dfs = (id: string, depth = 0) => {
		const n = byId.get(id)!;
		const indent = depth ? "  ".repeat(depth) + "• " : "";
		const label = n.name || "Unnamed folder";
		out.push({ label: `${indent}${label}`, value: n.id });

		n.children
			.map((cid) => byId.get(cid)!)
			.sort((a, b) => (a.name || "").localeCompare(b.name || "")) // safe compare
			.forEach((c) => dfs(c.id, depth + 1));
	};

	roots
		.map((rid) => byId.get(rid)!)
		.sort((a, b) => (a.name || "").localeCompare(b.name || ""))
		.forEach((r) => dfs(r.id));

	return out;
}

export function useMailboxOptions(params: {
	mailboxes: FetchIdentityMailboxListResult[number]["mailboxes"];
	identityLabel?: string;
	placeholder?: string;
}) {
	const { mailboxes, identityLabel, placeholder = "(no folders yet)" } = params;

	const tree = React.useMemo(() => buildMailboxTree(mailboxes), [mailboxes]);
	const flat = React.useMemo(() => flatten(tree), [tree]);

	const options: OptionGroup[] = React.useMemo(
		() => [
			{
				group: identityLabel ?? "Mailboxes",
				items: flat.length
					? flat
					: [{ label: placeholder, value: "none", disabled: true }],
			},
		],
		[identityLabel, flat, placeholder],
	);

	return { options, flat, tree };
}
