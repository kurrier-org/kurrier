"use client";

import React from "react";
import { Tree, type RenderTreeNodePayload, useTree } from "@mantine/core";
import {
	IconLabelFilled,
	IconCaretRightFilled,
	IconCaretDownFilled,
} from "@tabler/icons-react";
import AddNewLabel from "@/components/dashboard/labels/add-new-label";
import colors from "tailwindcss/colors";
import { useParams, useRouter } from "next/navigation";
import { FetchLabelsWithCountResult } from "@/lib/actions/mailbox";
import ManageLabels from "@/components/dashboard/labels/manage-labels";
import { LabelEntity } from "@db";

type LabelWithCount = LabelEntity & {
	threadCount?: number;
};

type LabelNode = {
	value: string;
	label: string;
	slug: string;
	threadCount: number;
	colorBg?: string | null;
	children?: LabelNode[];
};

function buildLabelTree(labels: LabelWithCount[]): LabelNode[] {
	const nodeById = new Map<string, LabelNode>();

	for (const l of labels) {
		nodeById.set(l.id, {
			value: l.id,
			label: l.name,
			slug: l.slug,
			threadCount: l.threadCount ?? 0,
			colorBg: l.colorBg,
			children: [],
		});
	}

	const roots: LabelNode[] = [];

	for (const l of labels) {
		const node = nodeById.get(l.id)!;

		if (l.parentId && nodeById.has(l.parentId)) {
			const parent = nodeById.get(l.parentId)!;
			parent.children!.push(node);
		} else {
			roots.push(node);
		}
	}

	const pruneEmptyChildren = (nodes: LabelNode[]) => {
		for (const n of nodes) {
			if (n.children && n.children.length === 0) {
				delete n.children;
			} else if (n.children) {
				pruneEmptyChildren(n.children);
			}
		}
	};

	pruneEmptyChildren(roots);
	return roots;
}

function LabelHome({
	globalLabels,
}: {
	globalLabels: FetchLabelsWithCountResult;
}) {
	const labels = globalLabels as LabelWithCount[];

	const treeData = buildLabelTree(labels);
	const { identityPublicId, mailboxSlug, labelSlug } = useParams();
	const router = useRouter();

	const selected = React.useMemo(() => {
		const match = labels.find((l) => l.slug === labelSlug);
		return match?.id ?? null;
	}, [labels, labelSlug]);

	const renderNode = ({
		node,
		level,
		expanded,
		hasChildren,
		elementProps,
	}: RenderTreeNodePayload) => {
		const labelNode = node as LabelNode;

		const isSelected = selected === labelNode.value;
		const Icon = IconLabelFilled;
		const color = labelNode.colorBg ?? colors.indigo["500"];

		return (
			<div
				{...elementProps}
				onClick={(e) => {
					elementProps.onClick?.(e);
					if (selected === labelNode.value) {
						router.push("/dashboard/mail");
						return;
					}
					router.push(
						`/dashboard/mail/${identityPublicId}/${mailboxSlug}/label/${labelNode.slug}`,
					);
				}}
				className={`
          flex items-center gap-2 rounded-md px-2 py-1 cursor-pointer
          hover:bg-gray-100 dark:hover:bg-slate-800/60
          ${isSelected ? "bg-gray-200 dark:bg-slate-800/80" : ""}
        `}
				style={{ paddingLeft: 8 + level * 8 }}
			>
				<span className="inline-flex w-3 justify-center">
					{hasChildren &&
						(expanded ? (
							<IconCaretDownFilled
								className="text-neutral-500 dark:text-white"
								size={14}
							/>
						) : (
							<IconCaretRightFilled
								className="text-neutral-600 dark:text-white"
								size={14}
							/>
						))}
				</span>

				<Icon size={24} style={{ color }} className="-ml-2" />

				<span className="truncate text-sm">{labelNode.label}</span>

				<span className="ml-auto text-xs text-muted-foreground tabular-nums mr-6">
					{labelNode.threadCount}
				</span>
			</div>
		);
	};

	const tree = useTree();

	return (
		<div className="flex h-full flex-col">
			<div className="mx-3 mt-8 mb-3 flex items-center justify-between">
				<div className="text-sm font-semibold tracking-tight">Labels</div>
				<div className="flex gap-2">
					<AddNewLabel globalLabels={globalLabels} />
					<ManageLabels globalLabels={globalLabels} />
				</div>
			</div>

			<div className="-mx-4 pb-4">
				<Tree
					selectOnClick
					tree={tree}
					data={treeData}
					levelOffset="lg"
					renderNode={renderNode}
				/>
			</div>
		</div>
	);
}

export default LabelHome;
