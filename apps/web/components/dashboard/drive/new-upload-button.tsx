"use client";
import React, { useRef, useState } from "react";
import { Plus, Upload, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Menu, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { addNewFolder } from "@/lib/actions/drive";
import { ReusableFormButton } from "@/components/common/reusable-form-button";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { DriveState } from "@schema";
import DriveUploader, { DriveUploaderHandle } from "@/components/dashboard/drive/drive-uploader";

export default function NewUploadButton({ hideOnMobile }: { hideOnMobile?: boolean }) {
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
                    <Button hidden={!hideOnMobile} size="lg" className={"w-full"}>
                        <Plus className="h-5 w-5" />
                        New
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
                        Upload
                    </Menu.Item>

                    <Menu.Item
                        disabled={!state?.driveRouteContext}
                        leftSection={<FolderPlus size={14} />}
                        onClick={() => {
                            setMenuOpened(false);
                            folderHandlers.open();
                        }}
                    >
                        Folder
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>

            <DriveUploader ref={uploaderRef} />

            <Modal
                opened={folderOpened}
                onClose={folderHandlers.close}
                title="New folder"
                centered
                size={"xs"}
                trapFocus={false}
            >
                <ReusableFormButton
                    action={addNewFolder}
                    label="Create Folder"
                    formWrapperClasses={"flex justify-center flex-col"}
                    onSuccess={() => folderHandlers.close()}
                    buttonProps={{
                        leftSection: <Plus size={16} />,
                        size: "sm",
                        className: "w-full mt-4",
                    }}
                >
                    <Input autoFocus name="name" />
                    <input type="hidden" name="path" value={state?.driveRouteContext?.withinPath ?? "/"} />
                    <input type="hidden" name="scope" value={state?.driveRouteContext?.scope ?? ""} />
                    <input type="hidden" name="publicId" value={state?.driveRouteContext?.driveVolume?.publicId ?? ""}/>
                </ReusableFormButton>
            </Modal>
        </>
    );
}
