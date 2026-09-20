"use client";

import React from "react";
import type {
    Editor,
} from "@tiptap/react";
import {
    ActionIcon,
    Button,
    Menu,
    Popover,
    Progress,
} from "@mantine/core";
import {
    Baseline,
    Bold,
    Check,
    Italic,
    List,
    ListOrdered,
    Paperclip,
    Redo2,
    RemoveFormatting,
    Signature,
    Strikethrough,
    Undo2,
    X,
} from "lucide-react";

import {
    useOptionalDictionary,
} from "@/components/providers/dictionary-provider";
import type {
    ComposerUpload,
} from "./mail-composer";
import MailComposerSchedule from "./mail-composer-schedule";

type MailComposerFooterProps = {
    editor: Editor | null;
    isPending: boolean;
    uploads: ComposerUpload[];
    signatures: Array<{
        publicId: string;
        name: string;
    }>;
    signaturePublicId: string;
    signaturesLoading: boolean;
    onSignatureChange: (
        publicId: string,
    ) => void;
    onAttach: () => void;
    onRemoveUpload: (
        uploadId: string,
    ) => void;
    onOpenUpload: (
        upload: ComposerUpload,
    ) => void;
};

function formatBytes(
    bytes: number,
) {
    const units = [
        "B",
        "KB",
        "MB",
        "GB",
    ];

    let value = bytes;
    let unit = 0;

    while (
        value >= 1024 &&
        unit < units.length - 1
        ) {
        value /= 1024;
        unit++;
    }

    return `${Math.round(
        value,
    )} ${units[unit]}`;
}

function SelectionIndicator({
                                selected,
                            }: {
    selected: boolean;
}) {
    return (
        <span className="flex h-4 w-4 items-center justify-center">
            {selected && (
                <Check size={14} />
            )}
        </span>
    );
}

export default function MailComposerFooter({
                                               editor,
                                               isPending,
                                               uploads,
                                               signatures,
                                               signaturePublicId,
                                               signaturesLoading,
                                               onSignatureChange,
                                               onAttach,
                                               onRemoveUpload,
                                               onOpenUpload,
                                           }: MailComposerFooterProps) {
    const dict =
        useOptionalDictionary();

    return (
        <>
            {uploads.length > 0 && (
                <div className="flex flex-col gap-2 border-t px-3 py-3">
                    {uploads.map(
                        (upload) => (
                            <div
                                key={
                                    upload.id
                                }
                                className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2"
                            >
                                <Paperclip
                                    size={
                                        16
                                    }
                                    className="shrink-0 text-muted-foreground"
                                />

                                <div className="min-w-0 flex-1">
                                    {upload.status ===
                                    "done" ? (
                                        <button
                                            type="button"
                                            className="block max-w-full truncate text-left text-sm font-medium hover:underline"
                                            onClick={() =>
                                                onOpenUpload(
                                                    upload,
                                                )
                                            }
                                        >
                                            {
                                                upload.name
                                            }
                                        </button>
                                    ) : (
                                        <div className="truncate text-sm font-medium">
                                            {
                                                upload.name
                                            }
                                        </div>
                                    )}

                                    <div className="text-xs text-muted-foreground">
                                        {upload.status ===
                                        "error"
                                            ? upload.error
                                            : formatBytes(
                                                upload.size,
                                            )}
                                    </div>

                                    {upload.status ===
                                        "uploading" && (
                                            <Progress
                                                value={
                                                    upload.progress
                                                }
                                                size="xs"
                                                className="mt-2"
                                            />
                                        )}
                                </div>

                                <ActionIcon
                                    type="button"
                                    variant="subtle"
                                    color="gray"
                                    aria-label="Remove attachment"
                                    onClick={() =>
                                        onRemoveUpload(
                                            upload.id,
                                        )
                                    }
                                >
                                    <X
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>
                            </div>
                        ),
                    )}
                </div>
            )}

            <div className="flex items-center border-t px-3 py-2">
                <div className="flex items-center gap-[1px]">
                    <Button
                        type="submit"
                        size="sm"
                        loading={isPending}
                        className="!rounded-l-full !rounded-r-sm"
                    >
                        {dict?.mailbox
                                ?.send ??
                            "Send"}
                    </Button>

                    <MailComposerSchedule />
                </div>

                <div className="ml-2 flex items-center">
                    <Popover
                        position="top-start"
                        offset={8}
                        shadow="md"
                        withArrow
                        zIndex={4000}
                        withinPortal
                    >
                        <Popover.Target>
                            <ActionIcon
                                type="button"
                                variant="transparent"
                                aria-label="Formatting"
                            >
                                <Baseline
                                    size={
                                        18
                                    }
                                />
                            </ActionIcon>
                        </Popover.Target>

                        <Popover.Dropdown className="!p-1">
                            <div className="flex items-center gap-1">
                                <ActionIcon
                                    type="button"
                                    variant={
                                        editor?.isActive(
                                            "bold",
                                        )
                                            ? "light"
                                            : "subtle"
                                    }
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .toggleBold()
                                            .run()
                                    }
                                    aria-label="Bold"
                                >
                                    <Bold
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>

                                <ActionIcon
                                    type="button"
                                    variant={
                                        editor?.isActive(
                                            "italic",
                                        )
                                            ? "light"
                                            : "subtle"
                                    }
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .toggleItalic()
                                            .run()
                                    }
                                    aria-label="Italic"
                                >
                                    <Italic
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>

                                <ActionIcon
                                    type="button"
                                    variant={
                                        editor?.isActive(
                                            "strike",
                                        )
                                            ? "light"
                                            : "subtle"
                                    }
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .toggleStrike()
                                            .run()
                                    }
                                    aria-label="Strikethrough"
                                >
                                    <Strikethrough
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>

                                <ActionIcon
                                    type="button"
                                    variant="subtle"
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .unsetAllMarks()
                                            .clearNodes()
                                            .run()
                                    }
                                    aria-label="Clear formatting"
                                >
                                    <RemoveFormatting
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>

                                <div className="mx-1 h-5 w-px bg-border" />

                                <ActionIcon
                                    type="button"
                                    variant={
                                        editor?.isActive(
                                            "bulletList",
                                        )
                                            ? "light"
                                            : "subtle"
                                    }
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .toggleBulletList()
                                            .run()
                                    }
                                    aria-label="Bullet list"
                                >
                                    <List
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>

                                <ActionIcon
                                    type="button"
                                    variant={
                                        editor?.isActive(
                                            "orderedList",
                                        )
                                            ? "light"
                                            : "subtle"
                                    }
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .toggleOrderedList()
                                            .run()
                                    }
                                    aria-label="Ordered list"
                                >
                                    <ListOrdered
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>

                                <div className="mx-1 h-5 w-px bg-border" />

                                <ActionIcon
                                    type="button"
                                    variant="subtle"
                                    disabled={
                                        !editor
                                            ?.can()
                                            .undo()
                                    }
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .undo()
                                            .run()
                                    }
                                    aria-label="Undo"
                                >
                                    <Undo2
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>

                                <ActionIcon
                                    type="button"
                                    variant="subtle"
                                    disabled={
                                        !editor
                                            ?.can()
                                            .redo()
                                    }
                                    onClick={() =>
                                        editor
                                            ?.chain()
                                            .focus()
                                            .redo()
                                            .run()
                                    }
                                    aria-label="Redo"
                                >
                                    <Redo2
                                        size={
                                            16
                                        }
                                    />
                                </ActionIcon>
                            </div>
                        </Popover.Dropdown>
                    </Popover>

                    <ActionIcon
                        type="button"
                        variant="transparent"
                        aria-label="Attach file"
                        title="Attach file"
                        onClick={onAttach}
                    >
                        <Paperclip
                            size={18}
                        />
                    </ActionIcon>

                    <Menu
                        shadow="md"
                        width={240}
                        position="top-start"
                        offset={8}
                        zIndex={4000}
                        withinPortal
                    >
                        <Menu.Target>
                            <ActionIcon
                                type="button"
                                variant={
                                    signaturePublicId
                                        ? "light"
                                        : "transparent"
                                }
                                loading={
                                    signaturesLoading
                                }
                                aria-label="Choose signature"
                                title="Choose signature"
                            >
                                <Signature
                                    size={
                                        18
                                    }
                                />
                            </ActionIcon>
                        </Menu.Target>

                        <Menu.Dropdown>
                            <Menu.Label>
                                Email
                                signature
                            </Menu.Label>

                            <Menu.Item
                                leftSection={
                                    <SelectionIndicator
                                        selected={
                                            !signaturePublicId
                                        }
                                    />
                                }
                                onClick={() =>
                                    onSignatureChange(
                                        "",
                                    )
                                }
                            >
                                No signature
                            </Menu.Item>

                            {signatures.length >
                                0 && (
                                    <Menu.Divider />
                                )}

                            {signatures.map(
                                (
                                    signature,
                                ) => (
                                    <Menu.Item
                                        key={
                                            signature.publicId
                                        }
                                        leftSection={
                                            <SelectionIndicator
                                                selected={
                                                    signature.publicId ===
                                                    signaturePublicId
                                                }
                                            />
                                        }
                                        onClick={() =>
                                            onSignatureChange(
                                                signature.publicId,
                                            )
                                        }
                                    >
                                        {
                                            signature.name
                                        }
                                    </Menu.Item>
                                ),
                            )}

                            {!signaturesLoading &&
                                signatures.length ===
                                0 && (
                                    <>
                                        <Menu.Divider />

                                        <Menu.Item
                                            disabled
                                        >
                                            No
                                            signatures
                                            available
                                        </Menu.Item>
                                    </>
                                )}
                        </Menu.Dropdown>
                    </Menu>
                </div>
            </div>
        </>
    );
}
