"use client";

import React, { useMemo, useState } from "react";
import {
	Popover,
	TextInput,
	ScrollArea,
	Checkbox,
	Button,
	ActionIcon,
	Tooltip,
} from "@mantine/core";
import { IconLabel, IconLabelFilled } from "@tabler/icons-react";
import { LabelEntity } from "@db";
import type { LabelScope } from "@schema";

type LabelAssignPopoverProps = {
	title: string;
	scope: LabelScope;
	allLabels: LabelEntity[];
	selectedLabelIds: string[];
	onToggleLabel: (
		labelId: string,
		nextChecked: boolean,
	) => Promise<void> | void;
};

export function LabelAssignPopover({
	title,
	scope,
	allLabels,
	selectedLabelIds,
	onToggleLabel,
}: LabelAssignPopoverProps) {
	const [opened, setOpened] = useState(false);
	const [query, setQuery] = useState("");

	const labelSet = new Set(selectedLabelIds);

	const filteredLabels = useMemo(() => {
		const q = query.trim().toLowerCase();
		const scoped = allLabels.filter(
			(l) => l.scope === scope || l.scope === "all",
		);
		if (!q) return scoped;
		return scoped.filter((l) => l.name.toLowerCase().includes(q));
	}, [allLabels, query, scope]);

	return (
		<Popover
			opened={opened}
			onChange={setOpened}
			withinPortal
			position="bottom-end"
			withArrow
			offset={12}
			arrowPosition="side"
			arrowSize={20}
			arrowOffset={24}
			trapFocus
			shadow="xl"
			radius="md"
		>
			<Popover.Target>
				<Tooltip label="Add or remove labels" withArrow>
					<ActionIcon
						onClick={(e) => {
							e.stopPropagation();
							setOpened((v) => !v);
						}}
						variant={"transparent"}
					>
						<IconLabel size={22} stroke={1.5} className={"mt-1"} />
					</ActionIcon>
				</Tooltip>
			</Popover.Target>

			<Popover.Dropdown className="w-72 bg-popover border border-border rounded-xl p-3 shadow-lg">
				<div className="flex flex-col gap-2">
					<div className="px-0.5 text-xs font-semibold text-muted-foreground">
						{title}
					</div>

					<TextInput
						size="xs"
						radius="md"
						placeholder="Search labels…"
						value={query}
						onChange={(event) => setQuery(event.currentTarget.value)}
					/>

					<ScrollArea.Autosize mah={220} className="mt-1.5">
						{filteredLabels.length === 0 ? (
							<div className="px-1.5 py-2 text-xs text-muted-foreground">
								No labels found
							</div>
						) : (
							<div className="flex flex-col gap-0.5">
								{filteredLabels.map((label) => {
									const checked = labelSet.has(label.id);

									return (
										<button
											key={label.id}
											type="button"
											onClick={async (e) => {
												e.stopPropagation();
												await onToggleLabel(label.id, !checked);
											}}
											className={[
												"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
												"hover:bg-muted",
												checked ? "bg-muted/70" : "",
											].join(" ")}
										>
											<IconLabelFilled
												size={24}
												style={{ color: label.colorBg || "#64748b" }}
												className="-ml-2"
											/>
											<span className="truncate text-xs">{label.name}</span>
											<span className="ml-auto">
												<Checkbox
													size="xs"
													checked={checked}
													readOnly
													className="pointer-events-none"
												/>
											</span>
										</button>
									);
								})}
							</div>
						)}
					</ScrollArea.Autosize>
				</div>
			</Popover.Dropdown>
		</Popover>
	);
}
