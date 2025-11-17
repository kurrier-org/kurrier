"use client";

import React, { useMemo, useState } from "react";
import { Popover, TextInput, ScrollArea, Checkbox } from "@mantine/core";
import { IconLabel, IconLabelFilled } from "@tabler/icons-react";
import { MailboxThreadEntity } from "@db";
import {
	addLabelToThread,
	FetchLabelsResult,
	FetchMailboxThreadLabelsResult,
	removeLabelFromThread,
} from "@/lib/actions/mailbox";
import { useDisclosure } from "@mantine/hooks";
import AddNewLabel from "@/components/dashboard/labels/add-new-label";

type LabelHoverButtonsProps = {
	mailboxThreadItem: MailboxThreadEntity;
	allLabels: FetchLabelsResult;
	labelsByThreadId: FetchMailboxThreadLabelsResult;
};

function LabelHoverButtons({
	mailboxThreadItem,
	allLabels,
	labelsByThreadId,
}: LabelHoverButtonsProps) {
	const [opened, { toggle }] = useDisclosure(false);
	const [query, setQuery] = useState("");
	const labelThreads = labelsByThreadId[mailboxThreadItem.threadId] || [];

	const filteredLabels = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return allLabels;
		return allLabels.filter((l) => l.name.toLowerCase().includes(q));
	}, [allLabels, query]);

	return (
		<Popover
			opened={opened}
			onChange={toggle}
			withinPortal
			position="bottom-end"
			withArrow
			offset={12}
			arrowPosition={"side"}
			arrowSize={20}
			arrowOffset={24}
			trapFocus={true}
			shadow={"xl"}
			radius={"md"}
		>
			<Popover.Target>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						toggle();
					}}
					className="rounded p-1 hover:bg-muted"
					title="Labels"
				>
					<IconLabel size={22} stroke={1.5} />
				</button>
			</Popover.Target>

			<Popover.Dropdown className="w-72 bg-popover border border-border rounded-xl p-3 shadow-lg">
				<div className="flex flex-col gap-2">
					<div className="px-0.5 text-xs font-semibold text-muted-foreground">
						Label message
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
									const checked = labelThreads.some(
										(lt) => lt?.label?.id === label?.id,
									);

									return (
										<button
											key={label.id}
											type="button"
											onClick={async (e) => {
												e.stopPropagation();
												if (checked) {
													await removeLabelFromThread({
														threadId: mailboxThreadItem.threadId,
														mailboxId: mailboxThreadItem.mailboxId,
														labelId: label.id,
													});
												} else {
													await addLabelToThread({
														threadId: mailboxThreadItem.threadId,
														mailboxId: mailboxThreadItem.mailboxId,
														labelId: label.id,
													});
												}
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
												className={"-ml-2"}
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

					<div className={"flex justify-center gap-2 items-center"}>
						<AddNewLabel globalLabels={allLabels} />
						Add new label
					</div>
				</div>
			</Popover.Dropdown>
		</Popover>
	);
}

export default LabelHoverButtons;
