"use client";

import {
    useCallback,
    useState,
} from "react";
import {
    Switch,
} from "@mantine/core";
import {
    createEmailDocument,
    type EmailDocument,
} from "@email-editor";
import {
    EmailEditor,
} from "@email-editor/react";

import {
    ReusableFormButton,
} from "@/components/common/reusable-form-button";
import {
    completeEmailAssetUpload,
    createEmailAssetUploadUrl,
} from "@/lib/actions/uploads-actions";
import {
    createEmailSignatureAction,
    deleteEmailSignatureAction,
    updateEmailSignatureAction,
    type DeletedEmailSignatureResult,
    type EmailSignatureResult,
} from "@/lib/actions/email-signatures";

type EmailSignaturesManagerProps = {
    identityPublicId: string;
    initialSignatures: EmailSignatureResult[];
};

const notification = {
    kind: "toast",
} as const;

const inputClass =
    "h-10 w-full rounded-md border border-neutral-200 bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-brand/40 dark:border-neutral-800";

const secondaryButtonClass =
    "h-10 rounded-md border border-neutral-200 bg-background px-3 text-sm hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:hover:bg-neutral-900";

async function uploadSignatureImage(
    file: File,
): Promise<string> {
    const allowedTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
    ]);

    if (!allowedTypes.has(file.type)) {
        throw new Error(
            "Only JPEG, PNG, GIF and WebP images are supported",
        );
    }

    if (file.size > 5 * 1024 * 1024) {
        throw new Error(
            "Images must be smaller than 5 MB",
        );
    }

    const upload =
        await createEmailAssetUploadUrl({
            fileName: file.name,
            contentType: file.type,
            sizeBytes: file.size,
        });

    const response = await fetch(
        upload.uploadUrl,
        {
            method: "PUT",
            headers: {
                "Content-Type": file.type,
            },
            body: file,
        },
    );

    if (!response.ok) {
        throw new Error(
            "Image upload failed",
        );
    }

    const asset =
        await completeEmailAssetUpload({
            publicId: upload.publicId,
            fileName: file.name,
        });

    return asset.url;
}

function sortSignatures(
    signatures: EmailSignatureResult[],
): EmailSignatureResult[] {
    return signatures
        .slice()
        .sort((left, right) =>
            left.name.localeCompare(
                right.name,
            ),
        );
}

export default function EmailSignaturesManager({
                                                   identityPublicId,
                                                   initialSignatures,
                                               }: EmailSignaturesManagerProps) {
    const firstSignature =
        initialSignatures[0] ?? null;

    const [signatures, setSignatures] =
        useState<EmailSignatureResult[]>(
            sortSignatures(
                initialSignatures,
            ),
        );

    const [publicId, setPublicId] =
        useState<string | null>(
            firstSignature?.publicId ??
            null,
        );

    const [name, setName] =
        useState(
            firstSignature?.name ??
            "New signature",
        );

    const [document, setDocument] =
        useState<EmailDocument>(
            firstSignature?.document ??
            createEmailDocument(),
        );

    const [
        isDefaultForNew,
        setIsDefaultForNew,
    ] = useState(
        firstSignature
            ?.isDefaultForNew ??
        false,
    );

    const [
        isDefaultForReplyForward,
        setIsDefaultForReplyForward,
    ] = useState(
        firstSignature
            ?.isDefaultForReplyForward ??
        false,
    );

    const [
        editorSessionKey,
        setEditorSessionKey,
    ] = useState(0);

    const selectSignature = (
        nextPublicId: string,
    ) => {
        const signature =
            signatures.find(
                (item) =>
                    item.publicId ===
                    nextPublicId,
            );

        if (!signature) {
            return;
        }

        setPublicId(signature.publicId);
        setName(signature.name);
        setDocument(signature.document);
        setIsDefaultForNew(
            signature.isDefaultForNew,
        );
        setIsDefaultForReplyForward(
            signature.isDefaultForReplyForward,
        );

        setEditorSessionKey(
            (current) => current + 1,
        );
    };

    const createNewSignature = () => {
        setPublicId(null);
        setName("New signature");
        setDocument(
            createEmailDocument(),
        );
        setIsDefaultForNew(false);
        setIsDefaultForReplyForward(
            false,
        );

        setEditorSessionKey(
            (current) => current + 1,
        );
    };

    const handleSaved = useCallback(
        (
            signature:
            EmailSignatureResult,
        ) => {
            setPublicId(
                signature.publicId,
            );
            setName(signature.name);
            setDocument(
                signature.document,
            );
            setIsDefaultForNew(
                signature.isDefaultForNew,
            );
            setIsDefaultForReplyForward(
                signature.isDefaultForReplyForward,
            );

            setSignatures((current) => {
                /*
                 * If this signature became a
                 * default, clear that flag
                 * locally from every other
                 * signature as well.
                 */
                const normalized =
                    current.map((item) => ({
                        ...item,
                        isDefaultForNew:
                            signature
                                .isDefaultForNew
                                ? item.publicId ===
                                signature.publicId
                                : item
                                    .isDefaultForNew,
                        isDefaultForReplyForward:
                            signature
                                .isDefaultForReplyForward
                                ? item.publicId ===
                                signature.publicId
                                : item
                                    .isDefaultForReplyForward,
                    }));

                const next = [
                    signature,
                    ...normalized.filter(
                        (item) =>
                            item.publicId !==
                            signature.publicId,
                    ),
                ];

                return sortSignatures(
                    next,
                );
            });
        },
        [],
    );

    const handleDeleted = useCallback(
        (
            deleted:
            DeletedEmailSignatureResult,
        ) => {
            setSignatures((current) =>
                current.filter(
                    (signature) =>
                        signature.publicId !==
                        deleted.publicId,
                ),
            );

            setPublicId(null);
            setName("New signature");
            setDocument(
                createEmailDocument(),
            );
            setIsDefaultForNew(false);
            setIsDefaultForReplyForward(
                false,
            );

            setEditorSessionKey(
                (current) => current + 1,
            );
        },
        [],
    );

    const saveAction = publicId
        ? updateEmailSignatureAction
        : createEmailSignatureAction;

    return (
        <div className="space-y-5">
            <div className="grid gap-4 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="grid min-w-56 flex-1 gap-1.5 text-sm">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            Signature
                        </span>

                        <select
                            className={
                                inputClass
                            }
                            value={
                                publicId ?? ""
                            }
                            onChange={(
                                event,
                            ) => {
                                const value =
                                    event
                                        .currentTarget
                                        .value;

                                if (value) {
                                    selectSignature(
                                        value,
                                    );
                                }
                            }}
                        >
                            <option value="">
                                New signature
                            </option>

                            {signatures.map(
                                (signature) => (
                                    <option
                                        key={
                                            signature.publicId
                                        }
                                        value={
                                            signature.publicId
                                        }
                                    >
                                        {
                                            signature.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    <button
                        type="button"
                        className={
                            secondaryButtonClass
                        }
                        onClick={
                            createNewSignature
                        }
                    >
                        New
                    </button>

                    <label className="grid min-w-64 flex-[2] gap-1.5 text-sm">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            Signature name
                        </span>

                        <input
                            type="text"
                            className={
                                inputClass
                            }
                            value={name}
                            maxLength={160}
                            placeholder="For example: Work"
                            onChange={(
                                event,
                            ) =>
                                setName(
                                    event
                                        .currentTarget
                                        .value,
                                )
                            }
                        />
                    </label>

                    <ReusableFormButton
                        action={saveAction}
                        label={
                            publicId
                                ? "Save changes"
                                : "Create signature"
                        }
                        notify={notification}
                        onSuccess={
                            handleSaved
                        }
                    >
                        <input
                            type="hidden"
                            name="publicId"
                            value={
                                publicId ?? ""
                            }
                        />

                        <input
                            type="hidden"
                            name="identityPublicId"
                            value={
                                identityPublicId
                            }
                        />

                        <input
                            type="hidden"
                            name="name"
                            value={name}
                        />

                        <input
                            type="hidden"
                            name="document"
                            value={JSON.stringify(
                                document,
                            )}
                        />

                        <input
                            type="hidden"
                            name="isDefaultForNew"
                            value={String(
                                isDefaultForNew,
                            )}
                        />

                        <input
                            type="hidden"
                            name="isDefaultForReplyForward"
                            value={String(
                                isDefaultForReplyForward,
                            )}
                        />
                    </ReusableFormButton>

                    {publicId && (
                        <ReusableFormButton
                            action={
                                deleteEmailSignatureAction
                            }
                            label="Delete"
                            notify={
                                notification
                            }
                            onSuccess={
                                handleDeleted
                            }
                            buttonProps={{
                                color: "red",
                                variant: "light",
                                onClick: (
                                    event,
                                ) => {
                                    const confirmed =
                                        window.confirm(
                                            `Delete "${name}"?`,
                                        );

                                    if (
                                        !confirmed
                                    ) {
                                        event.preventDefault();
                                    }
                                },
                            }}
                        >
                            <input
                                type="hidden"
                                name="publicId"
                                value={publicId}
                            />
                        </ReusableFormButton>
                    )}
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
                    <Switch
                        checked={
                            isDefaultForNew
                        }
                        onChange={(event) =>
                            setIsDefaultForNew(
                                event
                                    .currentTarget
                                    .checked,
                            )
                        }
                        label="Use by default for new messages"
                    />

                    <Switch
                        checked={
                            isDefaultForReplyForward
                        }
                        onChange={(event) =>
                            setIsDefaultForReplyForward(
                                event
                                    .currentTarget
                                    .checked,
                            )
                        }
                        label="Use by default for replies and forwards"
                    />
                </div>
            </div>

            <div>
                <div className="mb-3">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        Signature content
                    </h3>

                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                        This content will be
                        inserted below the message
                        body when the signature is
                        selected.
                    </p>
                </div>

                <div className="min-h-[700px]">
                    <EmailEditor

                        key={editorSessionKey}

                        preset="signature"

                        value={document}

                        onChange={setDocument}

                        onImageUpload={

                            uploadSignatureImage

                        }

                    />
                </div>
            </div>
        </div>
    );
}
