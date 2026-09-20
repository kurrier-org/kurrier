"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { toast } from "sonner";

import {
    createEmailDocument,
    renderEmailTemplate,
    type EmailDocument,
    type EmailEditorVariable,
} from "@email-editor";
import { EmailEditor } from "@email-editor/react";

import {
    completeEmailAssetUpload,
    createEmailAssetUploadUrl,
} from "@/lib/actions/uploads-actions";
import {
    createEmailTemplateAction,
    deleteEmailTemplateAction,
    duplicateEmailTemplateAction,
    getEmailTemplate,
    listEmailTemplates,
    updateEmailTemplateAction,
    type EmailTemplateResult,
    type EmailTemplateSummary,
} from "@/lib/actions/email-templates";
import {
    ReusableFormButton,
} from "@/components/common/reusable-form-button";

const emailVariables: EmailEditorVariable[] = [
    {
        key: "first_name",
        label: "First name",
        example: "Krishna",
    },
    {
        key: "last_name",
        label: "Last name",
        example: "Rokhale",
    },
    {
        key: "email",
        label: "Email address",
        example: "krishna@example.com",
    },
    {
        key: "company_name",
        label: "Company name",
        example: "Kurrier",
    },
];

const previewVariables = Object.fromEntries(
    emailVariables.map((variable) => [
        variable.key,
        variable.example ?? "",
    ]),
);

const initialDocument = createEmailDocument(
    () => "playground-text",
);

const templateSaveNotification = {
    kind: "toast",
} as const;

const templateDuplicateNotification = {
    kind: "toast",
} as const;

const templateDeleteNotification = {
    kind: "toast",
} as const;

const inputClass =
    "h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
    "h-10 rounded-md border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50";

async function uploadEmailImage(
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
        throw new Error("Image upload failed");
    }

    const asset =
        await completeEmailAssetUpload({
            publicId: upload.publicId,
            fileName: file.name,
        });

    return asset.url;
}

function toTemplateSummary(
    template: EmailTemplateResult,
): EmailTemplateSummary {
    return {
        publicId: template.publicId,
        name: template.name,
        subject: template.subject,
        previewText: template.previewText,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
    };
}

export default function EmailEditorPage() {
    const [document, setDocument] =
        useState<EmailDocument>(
            initialDocument,
        );

    const [publicId, setPublicId] =
        useState<string | null>(null);

    const [name, setName] = useState(
        "Untitled template",
    );

    const [subject, setSubject] =
        useState("");

    const [previewText, setPreviewText] =
        useState("");

    const [templates, setTemplates] =
        useState<EmailTemplateSummary[]>([]);

    const [
        loadingTemplates,
        setLoadingTemplates,
    ] = useState(true);

    const [
        loadingTemplate,
        setLoadingTemplate,
    ] = useState(false);

    /*
     * Remounting resets block selection, Tiptap
     * instances and undo/redo history.
     */
    const [
        editorSessionKey,
        setEditorSessionKey,
    ] = useState(0);

    const saveAction = publicId
        ? updateEmailTemplateAction
        : createEmailTemplateAction;

    const renderedTemplate = useMemo(
        () =>
            renderEmailTemplate({
                document,
                subject,
                previewText,
                variables: previewVariables,
                missingVariable: "preserve",
            }),
        [
            document,
            subject,
            previewText,
        ],
    );

    useEffect(() => {
        let cancelled = false;

        const loadTemplates = async () => {
            setLoadingTemplates(true);

            try {
                const items =
                    await listEmailTemplates();

                if (!cancelled) {
                    setTemplates(items);
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : "Failed to load templates",
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingTemplates(false);
                }
            }
        };

        void loadTemplates();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleSaved = useCallback(
        (template: EmailTemplateResult) => {
            setPublicId(template.publicId);
            setName(template.name);
            setSubject(template.subject);
            setPreviewText(template.previewText);
            setDocument(template.document);

            setTemplates((current) => [
                toTemplateSummary(template),
                ...current.filter(
                    (item) =>
                        item.publicId !==
                        template.publicId,
                ),
            ]);
        },
        [],
    );

    const handleDuplicated = useCallback(
        (template: EmailTemplateResult) => {
            setPublicId(template.publicId);
            setName(template.name);
            setSubject(template.subject);
            setPreviewText(template.previewText);
            setDocument(template.document);

            setTemplates((current) => [
                toTemplateSummary(template),
                ...current.filter(
                    (item) =>
                        item.publicId !==
                        template.publicId,
                ),
            ]);

            setEditorSessionKey(
                (current) => current + 1,
            );
        },
        [],
    );

    const handleDeleted = useCallback(
        (deleted: {
            publicId: string;
        }) => {
            setTemplates((current) =>
                current.filter(
                    (template) =>
                        template.publicId !==
                        deleted.publicId,
                ),
            );

            setPublicId(null);
            setName("Untitled template");
            setSubject("");
            setPreviewText("");
            setDocument(
                createEmailDocument(),
            );

            setEditorSessionKey(
                (current) => current + 1,
            );
        },
        [],
    );

    const loadTemplate = async (
        nextPublicId: string,
    ) => {
        if (
            !nextPublicId ||
            nextPublicId === publicId
        ) {
            return;
        }

        setLoadingTemplate(true);

        try {
            const template =
                await getEmailTemplate(
                    nextPublicId,
                );

            if (!template) {
                throw new Error(
                    "Template not found",
                );
            }

            setPublicId(template.publicId);
            setName(template.name);
            setSubject(template.subject);
            setPreviewText(
                template.previewText,
            );
            setDocument(template.document);

            setEditorSessionKey(
                (current) => current + 1,
            );
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load template",
            );
        } finally {
            setLoadingTemplate(false);
        }
    };

    const createNewTemplate = () => {
        setPublicId(null);
        setName("Untitled template");
        setSubject("");
        setPreviewText("");
        setDocument(
            createEmailDocument(),
        );

        setEditorSessionKey(
            (current) => current + 1,
        );
    };

    return (
        <main className="min-h-screen bg-muted/40 p-6">
            <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border bg-background p-4">
                <label className="grid min-w-56 gap-1.5 text-sm">
                    <span>Template</span>

                    <select
                        className={inputClass}
                        value={publicId ?? ""}
                        disabled={
                            loadingTemplates ||
                            loadingTemplate
                        }
                        onChange={(event) =>
                            void loadTemplate(
                                event.currentTarget
                                    .value,
                            )
                        }
                    >
                        <option value="">
                            {loadingTemplates
                                ? "Loading templates..."
                                : "New template"}
                        </option>

                        {templates.map(
                            (template) => (
                                <option
                                    key={
                                        template.publicId
                                    }
                                    value={
                                        template.publicId
                                    }
                                >
                                    {template.name}
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
                    disabled={loadingTemplate}
                    onClick={createNewTemplate}
                >
                    New
                </button>

                <label className="grid min-w-56 flex-1 gap-1.5 text-sm">
                    <span>Template name</span>

                    <input
                        type="text"
                        className={inputClass}
                        value={name}
                        maxLength={160}
                        onChange={(event) =>
                            setName(
                                event.currentTarget
                                    .value,
                            )
                        }
                    />
                </label>

                <label className="grid min-w-64 flex-[2] gap-1.5 text-sm">
                    <span>Subject</span>

                    <input
                        type="text"
                        className={inputClass}
                        value={subject}
                        maxLength={998}
                        placeholder="Email subject"
                        onChange={(event) =>
                            setSubject(
                                event.currentTarget
                                    .value,
                            )
                        }
                    />
                </label>

                <label className="grid min-w-64 flex-[2] gap-1.5 text-sm">
                    <span>Preview text</span>

                    <input
                        type="text"
                        className={inputClass}
                        value={previewText}
                        maxLength={500}
                        placeholder="Shown beside the subject in some inboxes"
                        onChange={(event) =>
                            setPreviewText(
                                event.currentTarget
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
                            : "Create template"
                    }
                    notify={
                        templateSaveNotification
                    }
                    onSuccess={handleSaved}
                >
                    <input
                        type="hidden"
                        name="publicId"
                        value={publicId ?? ""}
                    />

                    <input
                        type="hidden"
                        name="name"
                        value={name}
                    />

                    <input
                        type="hidden"
                        name="subject"
                        value={subject}
                    />

                    <input
                        type="hidden"
                        name="previewText"
                        value={previewText}
                    />

                    <input
                        type="hidden"
                        name="document"
                        value={JSON.stringify(
                            document,
                        )}
                    />
                </ReusableFormButton>

                {publicId && (
                    <>
                        <ReusableFormButton
                            action={
                                duplicateEmailTemplateAction
                            }
                            label="Duplicate"
                            notify={
                                templateDuplicateNotification
                            }
                            onSuccess={
                                handleDuplicated
                            }
                        >
                            <input
                                type="hidden"
                                name="publicId"
                                value={publicId}
                            />
                        </ReusableFormButton>

                        <ReusableFormButton
                            action={
                                deleteEmailTemplateAction
                            }
                            label="Delete"
                            notify={
                                templateDeleteNotification
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
                    </>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <section className="min-h-[700px]">
                    <EmailEditor
                        key={editorSessionKey}
                        value={document}
                        onChange={setDocument}
                        onImageUpload={
                            uploadEmailImage
                        }
                        variables={emailVariables}
                    />
                </section>

                <section className="rounded-lg border bg-background p-5">
                    <h2 className="mb-4 text-lg font-semibold">
                        Rendered preview
                    </h2>

                    <div className="mb-4 grid gap-3">
                        <div className="rounded-md border bg-muted/30 p-3">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                                Resolved subject
                            </p>

                            <p className="text-sm">
                                {renderedTemplate.subject ||
                                    "(No subject)"}
                            </p>
                        </div>

                        <div className="rounded-md border bg-muted/30 p-3">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                                Resolved preview text
                            </p>

                            <p className="text-sm">
                                {renderedTemplate.previewText ||
                                    "(No preview text)"}
                            </p>
                        </div>
                    </div>

                    <iframe
                        title="Email preview"
                        className="h-[560px] w-full rounded-md border bg-white"
                        srcDoc={
                            renderedTemplate.html
                        }
                    />

                    <div className="mt-4">
                        <p className="mb-2 text-sm font-semibold">
                            Plain-text version
                        </p>

                        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">
                            {renderedTemplate.text ||
                                "(No plain-text content)"}
                        </pre>
                    </div>
                </section>
            </div>
        </main>
    );
}
