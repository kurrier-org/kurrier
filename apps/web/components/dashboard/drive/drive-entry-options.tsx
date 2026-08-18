"use client";

import { ActionIcon, Menu } from "@mantine/core";
import { Download, MoreVertical, Trash2 } from "lucide-react";
import type { DriveEntryEntity } from "@db";
import { deleteDriveEntry, getDriveDownloadUrl } from "@/lib/actions/drive";
import { toast } from "sonner";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

export default function DriveEntryOptions({
											  entry,
										  }: {
	entry: DriveEntryEntity;
}) {
	const dict = useOptionalDictionary();
	const download = async () => {
		const url = await getDriveDownloadUrl(entry.id);
		window.location.href = url;
	};

	const remove = async () => {
		if (
			!window.confirm(
				`${dict?.drive?.deleteConfirmPrefix ?? 'Delete "'}${entry.name}${dict?.drive?.deleteConfirmSuffix ?? '"?\n\nThis action cannot be undone.'}`,
			)
		) {
			return;
		}
		const res = await deleteDriveEntry(entry.id);
		if (res.success) {
			toast.success(dict?.drive?.deleted ?? "Deleted");
		} else {
			toast.error(dict?.drive?.deleteFailed ?? "Delete failed");
		}
	};

	return (
		<div className="absolute right-3 top-3 z-10">
			<Menu shadow="md" width={160} position="bottom-end">
				<Menu.Target>
					<ActionIcon variant="subtle" color="gray">
						<MoreVertical size={16} />
					</ActionIcon>
				</Menu.Target>

				<Menu.Dropdown>
					{entry.type !== "folder" ? (
						<Menu.Item leftSection={<Download size={14} />} onClick={download}>
							{dict?.drive?.download ?? "Download"}
						</Menu.Item>
					) : null}

					<Menu.Item
						color="red"
						leftSection={<Trash2 size={14} />}
						onClick={remove}
					>
						{dict?.drive?.delete ?? "Delete"}
					</Menu.Item>
				</Menu.Dropdown>
			</Menu>
		</div>
	);
}
