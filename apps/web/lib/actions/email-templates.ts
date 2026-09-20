"use server";

import {
    emailTemplates,
} from "@db";
import type {
    EmailDocument,
} from "@email-editor";
import {
    type FormState,
    handleAction,
} from "@schema";
import {
    desc,
    eq,
} from "drizzle-orm";

import {
    isSignedIn,
} from "@/lib/actions/auth";
import {
    getWorkspaceId,
    rlsClient,
} from "@/lib/actions/clients";

const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );

const normalizeText = (
    value: string,
    maximumLength: number,
) => value.trim().slice(0, maximumLength);

const getFormString = (
    formData: FormData,
    name: string,
): string => {
    const value = formData.get(name);

    return typeof value === "string" ? value : "";
};

const validateDocument = (
    value: unknown,
): EmailDocument => {
    if (
        !value ||
        typeof value !== "object" ||
        !("version" in value) ||
        value.version !== 1 ||
        !("settings" in value) ||
        !value.settings ||
        typeof value.settings !== "object" ||
        !("blocks" in value) ||
        !Array.isArray(value.blocks)
    ) {
        throw new Error("Invalid email document");
    }

    return value as EmailDocument;
};

const parseDocumentField = (
    formData: FormData,
): EmailDocument => {
    const rawDocument = getFormString(
        formData,
        "document",
    );

    if (!rawDocument) {
        throw new Error("Email document is required");
    }

    try {
        return validateDocument(
            JSON.parse(rawDocument),
        );
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Invalid email document"
        ) {
            throw error;
        }

        throw new Error("Invalid email document");
    }
};

export type EmailTemplateSummary = {
    publicId: string;
    name: string;
    subject: string;
    previewText: string;
    createdAt: Date;
    updatedAt: Date;
};

export type EmailTemplateResult =
    EmailTemplateSummary & {
    document: EmailDocument;
};

export async function listEmailTemplates(): Promise<
    EmailTemplateSummary[]
> {
    const rls = await rlsClient();

    return rls((tx) =>
        tx
            .select({
                publicId: emailTemplates.publicId,
                name: emailTemplates.name,
                subject: emailTemplates.subject,
                previewText:
                emailTemplates.previewText,
                createdAt: emailTemplates.createdAt,
                updatedAt: emailTemplates.updatedAt,
            })
            .from(emailTemplates)
            .orderBy(desc(emailTemplates.updatedAt)),
    );
}

export async function getEmailTemplate(
    publicId: string,
): Promise<EmailTemplateResult | null> {
    if (!isUuid(publicId)) {
        return null;
    }

    const rls = await rlsClient();

    const [template] = await rls((tx) =>
        tx
            .select()
            .from(emailTemplates)
            .where(
                eq(emailTemplates.publicId, publicId),
            )
            .limit(1),
    );

    if (!template) {
        return null;
    }

    return {
        publicId: template.publicId,
        name: template.name,
        subject: template.subject,
        previewText: template.previewText,
        document: validateDocument(
            template.document,
        ),
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
    };
}

async function createTemplate(input: {
    name: string;
    subject: string;
    previewText: string;
    document: EmailDocument;
}): Promise<EmailTemplateResult> {
    const user = await isSignedIn();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const name = normalizeText(input.name, 160);

    if (!name) {
        throw new Error("Template name is required");
    }

    const document = validateDocument(
        input.document,
    );

    const rls = await rlsClient();
    const workspaceId = await getWorkspaceId();

    const [template] = await rls((tx) =>
        tx
            .insert(emailTemplates)
            .values({
                workspaceId,
                ownerId: user.id,
                name,
                subject: normalizeText(
                    input.subject,
                    998,
                ),
                previewText: normalizeText(
                    input.previewText,
                    500,
                ),
                document:
                    document as unknown as Record<
                        string,
                        unknown
                    >,
            })
            .returning(),
    );

    if (!template) {
        throw new Error(
            "Failed to create email template",
        );
    }

    return {
        publicId: template.publicId,
        name: template.name,
        subject: template.subject,
        previewText: template.previewText,
        document,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
    };
}

async function updateTemplate(input: {
    publicId: string;
    name: string;
    subject: string;
    previewText: string;
    document: EmailDocument;
}): Promise<EmailTemplateResult> {
    if (!isUuid(input.publicId)) {
        throw new Error("Invalid template ID");
    }

    const name = normalizeText(input.name, 160);

    if (!name) {
        throw new Error("Template name is required");
    }

    const document = validateDocument(
        input.document,
    );

    const rls = await rlsClient();

    const [template] = await rls((tx) =>
        tx
            .update(emailTemplates)
            .set({
                name,
                subject: normalizeText(
                    input.subject,
                    998,
                ),
                previewText: normalizeText(
                    input.previewText,
                    500,
                ),
                document:
                    document as unknown as Record<
                        string,
                        unknown
                    >,
                updatedAt: new Date(),
            })
            .where(
                eq(
                    emailTemplates.publicId,
                    input.publicId,
                ),
            )
            .returning(),
    );

    if (!template) {
        throw new Error("Template not found");
    }

    return {
        publicId: template.publicId,
        name: template.name,
        subject: template.subject,
        previewText: template.previewText,
        document,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
    };
}

export async function createEmailTemplateAction(
    _prev: FormState,
    formData: FormData,
): Promise<FormState<EmailTemplateResult>> {
    return handleAction(async () => {
        const template = await createTemplate({
            name: getFormString(
                formData,
                "name",
            ),
            subject: getFormString(
                formData,
                "subject",
            ),
            previewText: getFormString(
                formData,
                "previewText",
            ),
            document: parseDocumentField(formData),
        });

        return {
            success: true,
            message: "Email template created",
            data: template,
        };
    });
}

export async function updateEmailTemplateAction(
    _prev: FormState,
    formData: FormData,
): Promise<FormState<EmailTemplateResult>> {
    return handleAction(async () => {
        const template = await updateTemplate({
            publicId: getFormString(
                formData,
                "publicId",
            ),
            name: getFormString(
                formData,
                "name",
            ),
            subject: getFormString(
                formData,
                "subject",
            ),
            previewText: getFormString(
                formData,
                "previewText",
            ),
            document: parseDocumentField(formData),
        });

        return {
            success: true,
            message: "Email template saved",
            data: template,
        };
    });
}

export async function duplicateEmailTemplateAction(
    _prev: FormState,
    formData: FormData,
): Promise<FormState<EmailTemplateResult>> {
    return handleAction(async () => {
        const publicId = getFormString(
            formData,
            "publicId",
        );

        const source =
            await getEmailTemplate(publicId);

        if (!source) {
            throw new Error("Template not found");
        }

        const template = await createTemplate({
            name: `${source.name} copy`,
            subject: source.subject,
            previewText: source.previewText,
            document: source.document,
        });

        return {
            success: true,
            message: "Email template duplicated",
            data: template,
        };
    });
}

export async function deleteEmailTemplateAction(
    _prev: FormState,
    formData: FormData,
): Promise<
    FormState<{
        publicId: string;
    }>
> {
    return handleAction(async () => {
        const publicId = getFormString(
            formData,
            "publicId",
        );

        if (!isUuid(publicId)) {
            throw new Error("Invalid template ID");
        }

        const rls = await rlsClient();

        const [deleted] = await rls((tx) =>
            tx
                .delete(emailTemplates)
                .where(
                    eq(
                        emailTemplates.publicId,
                        publicId,
                    ),
                )
                .returning({
                    publicId:
                    emailTemplates.publicId,
                }),
        );

        if (!deleted) {
            throw new Error("Template not found");
        }

        return {
            success: true,
            message: "Email template deleted",
            data: deleted,
        };
    });
}
