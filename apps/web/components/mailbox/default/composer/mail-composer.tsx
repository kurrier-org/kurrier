"use client";

import "@mantine/tiptap/styles.css";

import React, {
    useActionState,
    useEffect, useMemo,
    useRef,
    useState,
} from "react";
import Form from "next/form";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import {
    Link,
    RichTextEditor,
} from "@mantine/tiptap";
import {
    useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

import type {
    MessageEntity,
} from "@db";
import type {
    FormState,
    PublicConfig,
} from "@schema";

import {
    useOptionalDictionary,
} from "@/components/providers/dictionary-provider";
import {
    type FetchIdentityMailboxListResult,
    sendMail,
} from "@/lib/actions/mailbox";
import {
    createAttachmentDownloadUrl,
    createAttachmentUploadUrl,
} from "@/lib/actions/uploads-actions";
import {
    listEmailSignatures,
    type EmailSignatureResult,
} from "@/lib/actions/email-signatures";

import MailComposerBody from "./mail-composer-body";
import MailComposerFooter from "./mail-composer-footer";
import MailComposerHeader from "./mail-composer-header";

type ComposerMode =
    | "compose"
    | "reply"
    | "forward";

export type ComposerAttachment = {
    path: string;
    sizeBytes: number;
    messageId: string;
    filenameOriginal: string;
    contentType: string;
};

export type ComposerUpload = {
    id: string;
    name: string;
    size: number;
    progress: number;
    status:
        | "uploading"
        | "done"
        | "error";
    error?: string;
    path?: string;
};

type MailComposerProps = {
    message?: MessageEntity | null;
    publicConfig: PublicConfig;
    identityMailboxes:
        FetchIdentityMailboxListResult;
    activeIdentityPublicId?: string;
    initialMode?: ComposerMode;
    onClose?: () => void;
};

import { renderEmailFragment } from "@email-editor";

export default function MailComposer({
                                         message = null,
                                         publicConfig,
                                         identityMailboxes,
                                         activeIdentityPublicId,
                                         initialMode = "compose",
                                         onClose,
                                     }: MailComposerProps) {
    const dict =
        useOptionalDictionary();

    const [mode, setMode] =
        useState<ComposerMode>(
            initialMode,
        );

    const [
        isDraggingFiles,
        setIsDraggingFiles,
    ] = useState(false);

    const dragDepthRef = useRef(0);

    const [subject, setSubject] =
        useState(() => {
            if (!message) {
                return "";
            }

            const original =
                message.subject?.trim() ||
                "";

            const cleaned =
                original.replace(
                    /^(re|fwd)\s*:\s*/gi,
                    "",
                );

            if (
                initialMode === "reply"
            ) {
                return `${
                    dict?.mailbox
                        ?.replyPrefix ??
                    "Re: "
                }${cleaned}`;
            }

            if (
                initialMode ===
                "forward"
            ) {
                return `${
                    dict?.mailbox
                        ?.forwardPrefix ??
                    "Fwd: "
                }${cleaned}`;
            }

            return original;
        });

    const [html, setHtml] =
        useState("");

    const [text, setText] =
        useState("");

    const [
        identityPublicId,
        setIdentityPublicId,
    ] = useState(
        activeIdentityPublicId ??
        identityMailboxes[0]
            ?.identity.publicId ??
        "",
    );

    const [
        signatures,
        setSignatures,
    ] = useState<
        EmailSignatureResult[]
    >([]);

    const [
        signaturePublicId,
        setSignaturePublicId,
    ] = useState("");

    const [
        signaturesLoading,
        setSignaturesLoading,
    ] = useState(false);

    const [uploads, setUploads] =
        useState<ComposerUpload[]>([]);

    const [
        attachments,
        setAttachments,
    ] = useState<
        ComposerAttachment[]
    >([]);

    const fileInputRef =
        useRef<HTMLInputElement | null>(
            null,
        );

    const newMessageId =
        useRef(uuidv4());

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit,
            Link,
            Image,
        ],
        parseOptions: {
            preserveWhitespace: "full",
        },
        onUpdate: ({ editor }) => {
            setHtml(
                editor
                    .getHTML()
                    .trim(),
            );

            setText(
                editor
                    .getText()
                    .trim(),
            );
        },
    });

    const [
        formState,
        formAction,
        isPending,
    ] = useActionState<
        FormState,
        FormData
    >(sendMail, {});

    useEffect(() => {
        if (!editor) {
            return;
        }

        editor.commands.focus("end");
    }, [editor]);

    useEffect(() => {
        if (!activeIdentityPublicId) {
            return;
        }

        setIdentityPublicId(
            activeIdentityPublicId,
        );
    }, [activeIdentityPublicId]);

    useEffect(() => {
        let cancelled = false;

        if (!identityPublicId) {
            setSignatures([]);
            setSignaturePublicId("");
            setSignaturesLoading(false);
            return;
        }

        const loadSignatures =
            async () => {
                setSignaturesLoading(true);

                try {
                    const items =
                        await listEmailSignatures(
                            identityPublicId,
                        );

                    if (cancelled) {
                        return;
                    }

                    setSignatures(items);

                    const defaultSignature =
                        mode === "compose"
                            ? items.find(
                                (
                                    item,
                                ) =>
                                    item.isDefaultForNew,
                            )
                            : items.find(
                                (
                                    item,
                                ) =>
                                    item.isDefaultForReplyForward,
                            );

                    setSignaturePublicId(
                        defaultSignature
                            ?.publicId ??
                        "",
                    );
                } catch (error) {
                    if (cancelled) {
                        return;
                    }

                    setSignatures([]);
                    setSignaturePublicId(
                        "",
                    );

                    toast.error(
                        dict?.common
                            ?.error ??
                        "Error",
                        {
                            description:
                                error instanceof
                                Error
                                    ? error.message
                                    : "Failed to load signatures",
                        },
                    );
                } finally {
                    if (!cancelled) {
                        setSignaturesLoading(
                            false,
                        );
                    }
                }
            };

        void loadSignatures();

        return () => {
            cancelled = true;
        };
    }, [
        identityPublicId,
        mode,
        dict,
    ]);

    useEffect(() => {
        if (formState.error) {
            toast.error(
                dict?.common?.error ??
                "Error",
                {
                    description:
                    formState.error,
                },
            );

            return;
        }

        if (formState.success) {
            toast.success(
                dict?.common?.success ??
                "Success",
                {
                    description:
                    formState.success,
                },
            );

            onClose?.();
        }
    }, [
        formState,
        dict,
        onClose,
    ]);

    const uploadFile = async (
        file: File,
    ) => {
        const uploadId = uuidv4();

        setUploads((current) => [
            ...current,
            {
                id: uploadId,
                name: file.name,
                size: file.size,
                progress: 0,
                status: "uploading",
            },
        ]);

        try {
            const {
                uploadUrl,
                key,
            } =
                await createAttachmentUploadUrl(
                    {
                        fileName:
                        file.name,
                        contentType:
                        file.type,
                        messageId:
                        newMessageId.current,
                    },
                );

            await new Promise<void>(
                (resolve, reject) => {
                    const xhr =
                        new XMLHttpRequest();

                    xhr.open(
                        "PUT",
                        uploadUrl,
                    );

                    xhr.setRequestHeader(
                        "Content-Type",
                        file.type ||
                        "application/octet-stream",
                    );

                    xhr.upload.onprogress =
                        (event) => {
                            if (
                                !event.lengthComputable
                            ) {
                                return;
                            }

                            const progress =
                                Math.round(
                                    (event.loaded /
                                        event.total) *
                                    100,
                                );

                            setUploads(
                                (
                                    current,
                                ) =>
                                    current.map(
                                        (
                                            upload,
                                        ) =>
                                            upload.id ===
                                            uploadId
                                                ? {
                                                    ...upload,
                                                    progress,
                                                }
                                                : upload,
                                    ),
                            );
                        };

                    xhr.onload = () => {
                        if (
                            xhr.status >=
                            200 &&
                            xhr.status < 300
                        ) {
                            resolve();
                            return;
                        }

                        reject(
                            new Error(
                                `${
                                    dict
                                        ?.mailbox
                                        ?.uploadFailedPrefix ??
                                    "Upload failed: "
                                }${xhr.status}`,
                            ),
                        );
                    };

                    xhr.onerror = () => {
                        reject(
                            new Error(
                                dict
                                    ?.mailbox
                                    ?.networkError ??
                                "Network error",
                            ),
                        );
                    };

                    xhr.send(file);
                },
            );

            const attachment:
                ComposerAttachment = {
                path: key,
                sizeBytes:
                file.size,
                messageId:
                newMessageId.current,
                filenameOriginal:
                file.name,
                contentType:
                    file.type ||
                    "application/octet-stream",
            };

            setAttachments(
                (current) => [
                    ...current,
                    attachment,
                ],
            );

            setUploads((current) =>
                current.map(
                    (upload) =>
                        upload.id ===
                        uploadId
                            ? {
                                ...upload,
                                progress: 100,
                                status: "done",
                                path: key,
                            }
                            : upload,
                ),
            );
        } catch (error) {
            setUploads((current) =>
                current.map(
                    (upload) =>
                        upload.id ===
                        uploadId
                            ? {
                                ...upload,
                                progress: 100,
                                status:
                                    "error",
                                error: String(
                                    error,
                                ),
                            }
                            : upload,
                ),
            );
        }
    };

    const handleFileSelect =
        async (
            event: React.ChangeEvent<HTMLInputElement>,
        ) => {
            const files = Array.from(
                event.target.files ??
                [],
            );

            for (const file of files) {
                await uploadFile(file);
            }

            event.target.value = "";
        };

    const handleDragEnter = (
        event: React.DragEvent<HTMLDivElement>,
    ) => {
        if (
            !event.dataTransfer.types.includes(
                "Files",
            )
        ) {
            return;
        }

        event.preventDefault();

        dragDepthRef.current += 1;
        setIsDraggingFiles(true);
    };

    const handleDragOver = (
        event: React.DragEvent<HTMLDivElement>,
    ) => {
        if (
            !event.dataTransfer.types.includes(
                "Files",
            )
        ) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect =
            "copy";
    };

    const handleDragLeave = (
        event: React.DragEvent<HTMLDivElement>,
    ) => {
        if (
            !event.dataTransfer.types.includes(
                "Files",
            )
        ) {
            return;
        }

        event.preventDefault();

        dragDepthRef.current =
            Math.max(
                0,
                dragDepthRef.current -
                1,
            );

        if (
            dragDepthRef.current === 0
        ) {
            setIsDraggingFiles(false);
        }
    };

    const handleDrop = async (
        event: React.DragEvent<HTMLDivElement>,
    ) => {
        if (
            !event.dataTransfer.types.includes(
                "Files",
            )
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        dragDepthRef.current = 0;
        setIsDraggingFiles(false);

        const files = Array.from(
            event.dataTransfer.files,
        );

        for (const file of files) {
            await uploadFile(file);
        }
    };

    const handleRemoveUpload = (
        uploadId: string,
    ) => {
        const upload = uploads.find(
            (item) =>
                item.id === uploadId,
        );

        setUploads((current) =>
            current.filter(
                (item) =>
                    item.id !== uploadId,
            ),
        );

        if (upload?.path) {
            setAttachments(
                (current) =>
                    current.filter(
                        (
                            attachment,
                        ) =>
                            attachment.path !==
                            upload.path,
                    ),
            );
        }
    };

    const handleOpenAttachment =
        async (
            upload: ComposerUpload,
        ) => {
            if (!upload.path) {
                return;
            }

            const { url } =
                await createAttachmentDownloadUrl(
                    upload.path,
                );

            window.open(
                url,
                "_blank",
                "noopener,noreferrer",
            );
        };

    const submittedSignaturePublicId =
        signatures.some(
            (signature) =>
                signature.publicId ===
                signaturePublicId,
        )
            ? signaturePublicId
            : "";

    const selectedSignature = useMemo(
        () =>
            signatures.find(
                (signature) =>
                    signature.publicId ===
                    submittedSignaturePublicId,
            ) ?? null,
        [
            signatures,
            submittedSignaturePublicId,
        ],
    );

    const signaturePreviewHtml = useMemo(
        () =>
            selectedSignature
                ? renderEmailFragment(
                    selectedSignature.document,
                )
                : "",
        [selectedSignature],
    );

    return (
        <div
            className="relative"
            onDragEnter={
                handleDragEnter
            }
            onDragOver={handleDragOver}
            onDragLeave={
                handleDragLeave
            }
            onDrop={handleDrop}
        >
            <Form action={formAction}>
                <RichTextEditor
                    editor={editor}
                    className="!overflow-hidden !rounded-none !border-0"
                >
                    <MailComposerHeader
                        mode={mode}
                        subject={subject}
                        identityPublicId={
                            identityPublicId
                        }
                        identityMailboxes={
                            identityMailboxes
                        }
                        message={message}
                        onModeChange={
                            setMode
                        }
                        onSubjectChange={
                            setSubject
                        }
                        onIdentityChange={
                            setIdentityPublicId
                        }
                    />

                    <MailComposerBody
                        signatureHtml={
                            signaturePreviewHtml
                        }
                    />

                    <MailComposerFooter
                        editor={editor}
                        isPending={
                            isPending
                        }
                        uploads={uploads}
                        signatures={
                            signatures
                        }
                        signaturePublicId={
                            submittedSignaturePublicId
                        }
                        signaturesLoading={
                            signaturesLoading
                        }
                        onSignatureChange={
                            setSignaturePublicId
                        }
                        onAttach={() =>
                            fileInputRef.current?.click()
                        }
                        onRemoveUpload={
                            handleRemoveUpload
                        }
                        onOpenUpload={
                            handleOpenAttachment
                        }
                    />
                </RichTextEditor>

                <input
                    type="hidden"
                    name="html"
                    value={html}
                />

                <input
                    type="hidden"
                    name="text"
                    value={text}
                />

                <input
                    type="hidden"
                    name="signaturePublicId"
                    value={
                        submittedSignaturePublicId
                    }
                />

                <input
                    type="hidden"
                    name="newMessageId"
                    value={
                        newMessageId.current
                    }
                />

                <input
                    type="hidden"
                    name="attachments"
                    value={JSON.stringify(
                        attachments,
                    )}
                />

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={
                        handleFileSelect
                    }
                />

                {message && (
                    <input
                        type="hidden"
                        name="originalMessageId"
                        value={message.id}
                    />
                )}
            </Form>

            {isDraggingFiles && (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-primary bg-background/85 backdrop-blur-[1px]">
                    <div className="rounded-lg bg-background px-5 py-3 text-sm font-medium shadow-sm">
                        {dict?.mailbox
                                ?.dropFilesToAttach ??
                            "Drop files to attach"}
                    </div>
                </div>
            )}
        </div>
    );
}
