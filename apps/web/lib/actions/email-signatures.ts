"use server";

import {
    emailSignatures,
    identities,
} from "@db";
import type {
    EmailDocument,
} from "@email-editor";
import {
    type FormState,
    handleAction,
} from "@schema";
import {
    and,
    asc,
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

    return typeof value === "string"
        ? value
        : "";
};

const getFormBoolean = (
    formData: FormData,
    name: string,
): boolean => {
    const value = getFormString(
        formData,
        name,
    ).toLowerCase();

    return (
        value === "true" ||
        value === "1" ||
        value === "on" ||
        value === "yes"
    );
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
        throw new Error(
            "Invalid email document",
        );
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
        throw new Error(
            "Signature document is required",
        );
    }

    try {
        return validateDocument(
            JSON.parse(rawDocument),
        );
    } catch (error) {
        if (
            error instanceof Error &&
            error.message ===
            "Invalid email document"
        ) {
            throw error;
        }

        throw new Error(
            "Invalid email document",
        );
    }
};

export type EmailSignatureResult = {
    publicId: string;
    identityId: string;
    name: string;
    document: EmailDocument;
    isDefaultForNew: boolean;
    isDefaultForReplyForward: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export type DeletedEmailSignatureResult = {
    publicId: string;
};

const toSignatureResult = (
    signature: typeof emailSignatures.$inferSelect,
): EmailSignatureResult => ({
    publicId: signature.publicId,
    identityId: signature.identityId,
    name: signature.name,
    document: validateDocument(
        signature.document,
    ),
    isDefaultForNew:
    signature.isDefaultForNew,
    isDefaultForReplyForward:
    signature.isDefaultForReplyForward,
    createdAt: signature.createdAt,
    updatedAt: signature.updatedAt,
});



export async function getEmailSignature(
    publicId: string,
): Promise<EmailSignatureResult | null> {
    if (!isUuid(publicId)) {
        return null;
    }

    const rls = await rlsClient();

    const [signature] = await rls(
        (tx) =>
            tx
                .select()
                .from(emailSignatures)
                .where(
                    eq(
                        emailSignatures.publicId,
                        publicId,
                    ),
                )
                .limit(1),
    );

    return signature
        ? toSignatureResult(signature)
        : null;
}

export async function listEmailSignatures(
    identityPublicId: string,
): Promise<EmailSignatureResult[]> {
    const normalizedIdentityPublicId =
        identityPublicId.trim();

    if (!normalizedIdentityPublicId) {
        return [];
    }

    const rls = await rlsClient();

    return rls(async (tx) => {
        const [identity] = await tx
            .select({
                id: identities.id,
            })
            .from(identities)
            .where(
                eq(
                    identities.publicId,
                    normalizedIdentityPublicId,
                ),
            )
            .limit(1);

        if (!identity) {
            return [];
        }

        const rows = await tx
            .select()
            .from(emailSignatures)
            .where(
                eq(
                    emailSignatures.identityId,
                    identity.id,
                ),
            )
            .orderBy(
                asc(emailSignatures.name),
            );

        return rows.map(
            toSignatureResult,
        );
    });
}

async function createSignature(input: {
    identityPublicId: string;
    name: string;
    document: EmailDocument;
    isDefaultForNew: boolean;
    isDefaultForReplyForward: boolean;
}): Promise<EmailSignatureResult> {
    const identityPublicId =
        input.identityPublicId.trim();

    if (!identityPublicId) {
        throw new Error(
            "Identity ID is required",
        );
    }

    const user = await isSignedIn();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const name = normalizeText(
        input.name,
        160,
    );

    if (!name) {
        throw new Error(
            "Signature name is required",
        );
    }

    const document = validateDocument(
        input.document,
    );

    const workspaceId =
        await getWorkspaceId();

    const rls = await rlsClient();

    const signature = await rls(
        async (tx) => {
            const [identity] = await tx
                .select({
                    id: identities.id,
                })
                .from(identities)
                .where(
                    eq(
                        identities.publicId,
                        identityPublicId,
                    ),
                )
                .limit(1);

            if (!identity) {
                throw new Error(
                    "Identity not found",
                );
            }

            if (input.isDefaultForNew) {
                await tx
                    .update(emailSignatures)
                    .set({
                        isDefaultForNew: false,
                        updatedAt: new Date(),
                    })
                    .where(
                        eq(
                            emailSignatures.identityId,
                            identity.id,
                        ),
                    );
            }

            if (
                input.isDefaultForReplyForward
            ) {
                await tx
                    .update(emailSignatures)
                    .set({
                        isDefaultForReplyForward:
                            false,
                        updatedAt: new Date(),
                    })
                    .where(
                        eq(
                            emailSignatures.identityId,
                            identity.id,
                        ),
                    );
            }

            const [created] = await tx
                .insert(emailSignatures)
                .values({
                    workspaceId,
                    ownerId: user.id,
                    identityId: identity.id,
                    name,
                    document:
                        document as unknown as Record<
                            string,
                            unknown
                        >,
                    isDefaultForNew:
                    input.isDefaultForNew,
                    isDefaultForReplyForward:
                    input.isDefaultForReplyForward,
                })
                .returning();

            if (!created) {
                throw new Error(
                    "Failed to create signature",
                );
            }

            return created;
        },
    );

    return toSignatureResult(signature);
}

async function updateSignature(input: {
    publicId: string;
    name: string;
    document: EmailDocument;
    isDefaultForNew: boolean;
    isDefaultForReplyForward: boolean;
}): Promise<EmailSignatureResult> {
    if (!isUuid(input.publicId)) {
        throw new Error(
            "Invalid signature ID",
        );
    }

    const name = normalizeText(
        input.name,
        160,
    );

    if (!name) {
        throw new Error(
            "Signature name is required",
        );
    }

    const document = validateDocument(
        input.document,
    );

    const rls = await rlsClient();

    const signature = await rls(
        async (tx) => {
            const [current] = await tx
                .select()
                .from(emailSignatures)
                .where(
                    eq(
                        emailSignatures.publicId,
                        input.publicId,
                    ),
                )
                .limit(1);

            if (!current) {
                throw new Error(
                    "Signature not found",
                );
            }

            if (input.isDefaultForNew) {
                await tx
                    .update(emailSignatures)
                    .set({
                        isDefaultForNew: false,
                        updatedAt: new Date(),
                    })
                    .where(
                        eq(
                            emailSignatures.identityId,
                            current.identityId,
                        ),
                    );
            }

            if (
                input.isDefaultForReplyForward
            ) {
                await tx
                    .update(emailSignatures)
                    .set({
                        isDefaultForReplyForward:
                            false,
                        updatedAt: new Date(),
                    })
                    .where(
                        eq(
                            emailSignatures.identityId,
                            current.identityId,
                        ),
                    );
            }

            const [updated] = await tx
                .update(emailSignatures)
                .set({
                    name,
                    document:
                        document as unknown as Record<
                            string,
                            unknown
                        >,
                    isDefaultForNew:
                    input.isDefaultForNew,
                    isDefaultForReplyForward:
                    input.isDefaultForReplyForward,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(
                            emailSignatures.id,
                            current.id,
                        ),
                        eq(
                            emailSignatures.identityId,
                            current.identityId,
                        ),
                    ),
                )
                .returning();

            if (!updated) {
                throw new Error(
                    "Signature not found",
                );
            }

            return updated;
        },
    );

    return toSignatureResult(signature);
}

export async function createEmailSignatureAction(
    _prev: FormState,
    formData: FormData,
): Promise<
    FormState<EmailSignatureResult>
> {
    return handleAction(async () => {
        const signature =
            await createSignature({
                identityPublicId:
                    getFormString(
                        formData,
                        "identityPublicId",
                    ),
                name: getFormString(
                    formData,
                    "name",
                ),
                document:
                    parseDocumentField(
                        formData,
                    ),
                isDefaultForNew:
                    getFormBoolean(
                        formData,
                        "isDefaultForNew",
                    ),
                isDefaultForReplyForward:
                    getFormBoolean(
                        formData,
                        "isDefaultForReplyForward",
                    ),
            });

        return {
            success: true,
            message:
                "Email signature created",
            data: signature,
        };
    });
}

export async function updateEmailSignatureAction(
    _prev: FormState,
    formData: FormData,
): Promise<
    FormState<EmailSignatureResult>
> {
    return handleAction(async () => {
        const signature =
            await updateSignature({
                publicId:
                    getFormString(
                        formData,
                        "publicId",
                    ),
                name: getFormString(
                    formData,
                    "name",
                ),
                document:
                    parseDocumentField(
                        formData,
                    ),
                isDefaultForNew:
                    getFormBoolean(
                        formData,
                        "isDefaultForNew",
                    ),
                isDefaultForReplyForward:
                    getFormBoolean(
                        formData,
                        "isDefaultForReplyForward",
                    ),
            });

        return {
            success: true,
            message:
                "Email signature saved",
            data: signature,
        };
    });
}

export async function deleteEmailSignatureAction(
    _prev: FormState,
    formData: FormData,
): Promise<
    FormState<DeletedEmailSignatureResult>
> {
    return handleAction(async () => {
        const publicId =
            getFormString(
                formData,
                "publicId",
            );

        if (!isUuid(publicId)) {
            throw new Error(
                "Invalid signature ID",
            );
        }

        const rls = await rlsClient();

        const [deleted] = await rls(
            (tx) =>
                tx
                    .delete(emailSignatures)
                    .where(
                        eq(
                            emailSignatures.publicId,
                            publicId,
                        ),
                    )
                    .returning({
                        publicId:
                        emailSignatures.publicId,
                    }),
        );

        if (!deleted) {
            throw new Error(
                "Signature not found",
            );
        }

        return {
            success: true,
            message:
                "Email signature deleted",
            data: deleted,
        };
    });
}
