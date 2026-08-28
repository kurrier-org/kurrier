"use client";
import { Menu, Modal, TextInput } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { DriveState } from "@schema";
import { FolderPlus, Plus, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ReusableFormButton } from "@/components/common/reusable-form-button";
import DriveUploader, {
	type DriveUploaderHandle,
} from "@/components/dashboard/drive/drive-uploader";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Button } from "@/components/ui/button";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { addNewFolder } from "@/lib/actions/drive";
import { cn } from "@/lib/utils";

export default function NewUploadButton({
	compact = false,
	className,
}: {
	compact?: boolean;
	className?: string;
}) {
	const dict = useOptionalDictionary();
	const router = useRouter();
	const [folderOpened, folderHandlers] = useDisclosure(false);
	const { state } = useDynamicContext<DriveState>();
	const uploaderRef = useRef<DriveUploaderHandle | null>(null);

	const [menuOpened, setMenuOpened] = useState(false);
	const canCreate = Boolean(
		state?.driveRouteContext?.driveVolume &&
			state.driveRouteContext.scope === "cloud",
	);

	return (
		<>
			<Menu
				shadow="md"
				width={150}
				withArrow
				opened={menuOpened}
				onChange={setMenuOpened}
				closeOnItemClick={false}
			>
				<Menu.Target>
					<Button
						size={compact ? "icon" : "lg"}
						disabled={!canCreate}
						aria-label={compact ? (dict?.drive?.new ?? "New") : undefined}
						className={cn(!compact && "w-full", compact && "size-9", className)}
					>
						<Plus />
						<span className={compact ? "sr-only" : ""}>
							{dict?.drive?.new ?? "New"}
						</span>
					</Button>
				</Menu.Target>

				<Menu.Dropdown>
					<Menu.Item
						leftSection={<Upload size={14} />}
						disabled={!canCreate}
						onClick={() => {
							setMenuOpened(false);
							uploaderRef.current?.openPicker();
						}}
					>
						{dict?.drive?.uploadFiles ?? dict?.drive?.upload ?? "Upload files"}
					</Menu.Item>

					<Menu.Item
						disabled={!canCreate}
						leftSection={<FolderPlus size={14} />}
						onClick={() => {
							setMenuOpened(false);
							folderHandlers.open();
						}}
					>
						{dict?.drive?.createFolder ?? "Create folder"}
					</Menu.Item>
				</Menu.Dropdown>
			</Menu>

			<DriveUploader ref={uploaderRef} uploadStrategy={"proxy"} />

			<Modal
				opened={folderOpened}
				onClose={folderHandlers.close}
				title={dict?.drive?.newFolder ?? "New folder"}
				centered
				size={"xs"}
				trapFocus
			>
				<ReusableFormButton
					action={addNewFolder}
					label={dict?.drive?.createFolder ?? "Create Folder"}
					formWrapperClasses={"flex justify-center flex-col"}
					onSuccess={() => {
						folderHandlers.close();
						router.refresh();
					}}
					buttonProps={{
						leftSection: <Plus size={16} />,
						size: "sm",
						className: "mt-4 w-full",
					}}
				>
					<TextInput
						autoFocus
						required
						name="name"
						label={dict?.drive?.folderName ?? "Folder name"}
						placeholder={dict?.drive?.folderNamePlaceholder ?? "Project files"}
					/>
					<input
						type="hidden"
						name="path"
						value={state?.driveRouteContext?.withinPath ?? "/"}
					/>
					<input
						type="hidden"
						name="scope"
						value={state?.driveRouteContext?.scope ?? ""}
					/>
					<input
						type="hidden"
						name="publicId"
						value={state?.driveRouteContext?.driveVolume?.publicId ?? ""}
					/>
				</ReusableFormButton>
			</Modal>
		</>
	);
}
