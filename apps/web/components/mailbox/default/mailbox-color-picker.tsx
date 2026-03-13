"use client";

import { ActionIcon, ColorSwatch, Popover, Tooltip } from "@mantine/core";
import { Paintbrush, X } from "lucide-react";
import { useState, useTransition } from "react";
import { updateMailboxColor } from "@/lib/actions/mailbox";

const MAILBOX_COLORS = [
	"#e03131",
	"#e8590c",
	"#f08c00",
	"#2f9e44",
	"#1971c2",
	"#6741d9",
	"#c2255c",
	"#868e96",
];

export function MailboxColorPicker({
	mailboxId,
	currentColor,
}: {
	mailboxId: string;
	currentColor: string | null;
}) {
	const [opened, setOpened] = useState(false);
	const [pending, startTransition] = useTransition();

	const handleSelect = (color: string | null) => {
		startTransition(async () => {
			await updateMailboxColor(mailboxId, color);
			setOpened(false);
		});
	};

	return (
		<Popover
			opened={opened}
			onChange={setOpened}
			position="bottom"
			withArrow
			shadow="md"
		>
			<Popover.Target>
				<ActionIcon
					size={16}
					variant="subtle"
					onClick={(e: React.MouseEvent) => {
						e.preventDefault();
						e.stopPropagation();
						setOpened((o) => !o);
					}}
					aria-label="Set mailbox color"
					className="opacity-0 group-hover:opacity-100 transition-opacity"
				>
					{currentColor ? (
						<ColorSwatch color={currentColor} size={12} />
					) : (
						<Paintbrush className="h-3 w-3" />
					)}
				</ActionIcon>
			</Popover.Target>

			<Popover.Dropdown>
				<div className="flex flex-wrap gap-2 p-1 max-w-[160px]">
					{MAILBOX_COLORS.map((color) => (
						<button
							key={color}
							type="button"
							onClick={() => handleSelect(color)}
							disabled={pending}
							className="p-0 m-0 bg-transparent border-0 rounded-full"
							style={{ lineHeight: 0 }}
						>
							<Tooltip label={color} withArrow>
								<ColorSwatch
									color={color}
									size={20}
									withShadow
									className={`cursor-pointer transition-all ${
										currentColor === color
											? "ring-2 ring-offset-1 ring-[color:var(--color-brand-500)]"
											: ""
									}`}
									style={{
										transform:
											currentColor === color ? "scale(1.1)" : "scale(1)",
									}}
								/>
							</Tooltip>
						</button>
					))}
					{currentColor && (
						<button
							type="button"
							onClick={() => handleSelect(null)}
							disabled={pending}
							className="p-0 m-0 bg-transparent border-0 rounded-full"
							style={{ lineHeight: 0 }}
						>
							<Tooltip label="Remove color" withArrow>
								<ActionIcon size={20} variant="default" radius="xl">
									<X className="h-3 w-3" />
								</ActionIcon>
							</Tooltip>
						</button>
					)}
				</div>
			</Popover.Dropdown>
		</Popover>
	);
}
