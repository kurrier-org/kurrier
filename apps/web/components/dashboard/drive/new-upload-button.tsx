"use client";
import { Input, Menu, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { DriveState } from "@schema";
import { FolderPlus, Plus, Upload } from "lucide-react";
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
	const [folderOpened, folderHandlers] = useDisclosure(false);
	const { state } = useDynamicContext<DriveState>();
	const uploaderRef = useRef<DriveUploaderHandle | null>(null);

	const [menuOpened, setMenuOpened] = useState(false);

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
						className={cn(!compact && "w-full", className)}
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
						disabled={!state?.driveRouteContext}
						onClick={() => {
							setMenuOpened(false);
							uploaderRef.current?.openPicker();
						}}
					>
						{dict?.drive?.upload ?? "Upload"}
					</Menu.Item>

					<Menu.Item
						disabled={!state?.driveRouteContext}
						leftSection={<FolderPlus size={14} />}
						onClick={() => {
							setMenuOpened(false);
							folderHandlers.open();
						}}
					>
						{dict?.drive?.folder ?? "Folder"}
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
				trapFocus={false}
			>
				<ReusableFormButton
					action={addNewFolder}
					label={dict?.drive?.createFolder ?? "Create Folder"}
					formWrapperClasses={"flex justify-center flex-col"}
					onSuccess={() => folderHandlers.close()}
					buttonProps={{
						leftSection: <Plus size={16} />,
						size: "sm",
						className: "w-full mt-4",
					}}
				>
					<Input autoFocus name="name" />
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
