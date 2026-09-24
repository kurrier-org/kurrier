"use server"

import {getWorkspaceId, rlsClient} from "@/lib/actions/clients";
import {and, eq} from "drizzle-orm";
import {
    db,
    identities,
    UserEntity,
    workspaceIdentityMembers, workspaceMembers, workspaces,
} from "@db";
import {FormState, getServerEnv, handleAction, ThemeNameSchema, WORKSPACE_THEME_COOKIE} from "@schema";
import {decode} from "decode-formdata";
import {revalidatePath} from "next/cache";
import {users} from "@db";
import {createHash, randomUUID} from "node:crypto";
import {isSignedIn} from "@/lib/actions/auth";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";

import {
    fetchWorkspace as fetchWorkspaceShared,
    fetchWorkspaceMembers as fetchWorkspaceMembersShared,
    refreshView as refreshViewShared
} from "./shared";
import {DISTRIBUTION_CONFIG} from "@distribution";
import {s3} from "@common";
import {DeleteObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";

export type {
    FetchWorkspaceMembersResult,
} from "./shared";

export async function fetchWorkspace() {
    return fetchWorkspaceShared();
}

export async function fetchWorkspaceMembers(id: string) {
    return fetchWorkspaceMembersShared(id);
}

export const refreshView = async (path: string) => {
    return refreshViewShared(path);
};

export const fetchWorkspaceIdentities = async () => {
    const rls = await rlsClient();
    return await rls((tx) =>
        tx.select().from(workspaceIdentityMembers)
    );
};

export type FetchWorkspaceIdentitiesResult = Awaited<
    ReturnType<typeof fetchWorkspaceIdentities>
>;

export const workspaceIdentityAssignments = async () => {
    const workspace = await fetchWorkspace();

    return await db
        .select({
            workspace_identity_members: workspaceIdentityMembers,
            users: {
                id: users.id,
                email: users.email
            },
        })
        .from(workspaceIdentityMembers)
        .leftJoin(users, eq(workspaceIdentityMembers.userId, users.id))
        .where(eq(workspaceIdentityMembers.workspaceId, workspace.id));
};


export type FetchAdminWorkspaceIdentitiesResult = Awaited<
    ReturnType<typeof workspaceIdentityAssignments>
>;


export type UpdateIdentityAccessResult =
    | { success: true }
    | { success: false; error: string };

export async function updateIdentityAccess(input: {
    identityId: string;
    sharedWithWorkspace: boolean;
    memberIds: string[];
}): Promise<UpdateIdentityAccessResult> {
    if (!DISTRIBUTION_CONFIG.features.identityAccessManagement) {
        return {
            success: false,
            error: "Identity access management is disabled.",
        };
    }

    const user = await isSignedIn();

    if (!user) {
        return {
            success: false,
            error: "Not authenticated.",
        };
    }

    const workspaceId = await getWorkspaceId();

    const [membership] = await db
        .select({
            role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .where(
            and(
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(workspaceMembers.userId, user.id)
            )
        )
        .limit(1);

    if (!membership || !["owner", "admin"].includes(membership.role)) {
        return {
            success: false,
            error: "You do not have permission to manage identity access.",
        };
    }

    const [[identity], [workspace], members] = await Promise.all([
        db
            .select({
                id: identities.id,
            })
            .from(identities)
            .where(
                and(
                    eq(identities.id, input.identityId),
                    eq(identities.workspaceId, workspaceId)
                )
            )
            .limit(1),

        db
            .select({
                defaultIdentityId: workspaces.defaultIdentityId,
            })
            .from(workspaces)
            .where(eq(workspaces.id, workspaceId))
            .limit(1),

        db
            .select({
                userId: workspaceMembers.userId,
            })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.workspaceId, workspaceId)),
    ]);

    if (!identity || !workspace) {
        return {
            success: false,
            error: "Identity not found.",
        };
    }

    if (
        workspace.defaultIdentityId === identity.id &&
        !input.sharedWithWorkspace
    ) {
        return {
            success: false,
            error: "The default identity must remain available to the workspace.",
        };
    }

    const workspaceMemberIds = new Set(
        members.map((member) => String(member.userId))
    );

    const requestedMemberIds = [...new Set(input.memberIds.map(String))];

    if (
        requestedMemberIds.some((memberId) => !workspaceMemberIds.has(memberId))
    ) {
        return {
            success: false,
            error: "One or more selected members are invalid.",
        };
    }

    if (!input.sharedWithWorkspace && requestedMemberIds.length === 0) {
        return {
            success: false,
            error: "Select at least one workspace member.",
        };
    }

    const assignedMemberIds = input.sharedWithWorkspace
        ? [...workspaceMemberIds]
        : requestedMemberIds;

    await db.transaction(async (tx) => {
        await tx
            .update(identities)
            .set({
                sharedWithWorkspace: input.sharedWithWorkspace,
            })
            .where(
                and(
                    eq(identities.id, identity.id),
                    eq(identities.workspaceId, workspaceId)
                )
            );

        await tx
            .delete(workspaceIdentityMembers)
            .where(
                and(
                    eq(workspaceIdentityMembers.workspaceId, workspaceId),
                    eq(workspaceIdentityMembers.identityId, identity.id)
                )
            );

        if (assignedMemberIds.length) {
            await tx.insert(workspaceIdentityMembers).values(
                assignedMemberIds.map((userId) => ({
                    workspaceId,
                    identityId: identity.id,
                    userId,
                }))
            );
        }
    });

    revalidatePath(
        "/[locale]/w/[wPublicId]/dashboard/platform/identities",
        "page"
    );

    return { success: true };
}



export const fetchWorkspaces = async () => {
    const user = await isSignedIn();
    const userWorkspaces = await db
        .select().from(workspaces)
        .innerJoin(
            workspaceMembers,
            eq(workspaces.id, workspaceMembers.workspaceId)
        )
        .where(
            eq(workspaceMembers.userId, user?.id || "")
        )
    return userWorkspaces;
};

export type FetchWorkspacesResult = Awaited<
    ReturnType<typeof fetchWorkspaces>
>;

export const setWorkspaceDefaultIdentity = async (identityId: string) => {
    const workspace = await fetchWorkspace();
    if (!workspace) return { success: false };

    const rls = await rlsClient();
    await rls(async (tx) => {
        await tx.update(identities).set({ sharedWithWorkspace: true }).where(eq(identities.id, identityId));
        await tx
            .update(workspaces)
            .set({ defaultIdentityId: null });
        await tx
            .update(workspaces)
            .set({ defaultIdentityId: identityId })
            .where(eq(workspaces.id, workspace.id));
    });

    return { success: true };
};

export const checkDefaultWorkspaceIdentity = async () => {
    const workspaceId = await getWorkspaceId();
    const userId = String((await isSignedIn())?.id);
    const userIdentities = await db.select().from(identities).where(and(
        eq(identities.sharedWithWorkspace, true),
        eq(identities.ownerId, userId),
        eq(identities.workspaceId, workspaceId)
    ))

    if (userIdentities.length === 1) {
        await setWorkspaceDefaultIdentity(userIdentities[0].id);
    }
};

export async function toggleDefaultIdentity(
    _prev: FormState,
    formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const decodedForm = decode(formData) as Record<string, unknown>;
        await setWorkspaceDefaultIdentity(String(decodedForm.identityId));
        revalidatePath("/w/[wPublicId]/dashboard/platform/identities", "page");
        return { success: true };
    });
}



export async function updateWorkspace(
    _prev: FormState,
    formData: FormData
): Promise<FormState> {
    return handleAction(async () => {
        const decodedForm = decode(formData) as Record<string, unknown>;
        const name = String(decodedForm.name ?? "").trim();
        const theme = ThemeNameSchema.parse(decodedForm.theme);

        if (!name) {
            return { success: false, error: "Workspace name is required." };
        }

        const workspaceId = await getWorkspaceId();
        const rls = await rlsClient();

        const [updated] = await rls((tx) =>
            tx
                .update(workspaces)
                .set({ name, theme })
                .where(eq(workspaces.id, workspaceId))
                .returning({ theme: workspaces.theme }),
        );

        if (!updated) {
            return { success: false, error: "Could not update workspace." };
        }

        (await cookies()).set(WORKSPACE_THEME_COOKIE, updated.theme, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 365,
        });

        revalidatePath("/w/[wPublicId]/dashboard/platform/workspace", "page");

        return { success: true, message: "workspace.updated" };
    });
}


function sha256Hex(input: string) {
    return createHash("sha256").update(input).digest("hex");
}

export const switchWorkSpace = async (workspacePublicId: string, id: string) => {
    await updateWorkSpaceContext(workspacePublicId, id);
    redirect(`/w/${workspacePublicId}/dashboard/platform/overview`)
};


export const updateWorkSpaceContext = async (
    workspacePublicId: string,
    id: string,
    user?: UserEntity
) => {
    const currentUser = user ?? (await isSignedIn());

    if (!currentUser?.id) {
        throw new Error("Not authenticated.");
    }

    const [[member], [workspace]] = await Promise.all([
        db
            .select({ role: workspaceMembers.role })
            .from(workspaceMembers)
            .where(
                and(
                    eq(workspaceMembers.workspaceId, id),
                    eq(workspaceMembers.userId, currentUser.id)
                )
            )
            .limit(1),
        db
            .select({ theme: workspaces.theme })
            .from(workspaces)
            .where(
                and(eq(workspaces.id, id), eq(workspaces.publicId, workspacePublicId))
            )
            .limit(1),
    ]);

    if (!member || !workspace) {
        throw new Error("Workspace not found.");
    }

    const cookieStore = await cookies();

    cookieStore.set({
        name: "workspaceId",
        value: id,
        httpOnly: true,
        path: "/",
    });

    cookieStore.set({
        name: "workspacePublicId",
        value: workspacePublicId,
        httpOnly: true,
        path: "/",
    });

    cookieStore.set({
        name: "workspaceRole",
        value: member.role,
        httpOnly: true,
        path: "/",
    });

    cookieStore.set({
        name: WORKSPACE_THEME_COOKIE,
        value: ThemeNameSchema.catch("indigo").parse(workspace.theme),
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
    });
};

export async function updateWorkspaceLogo(
    _prev: FormState,
    formData: FormData
): Promise<FormState> {
    return handleAction(async () => {
        const user = await isSignedIn();
        const file = formData.get("logo");

        if (!user) {
            return { success: false, error: "Not authenticated." };
        }

        if (!(file instanceof File) || file.size === 0) {
            return { success: false, error: "Select a logo." };
        }

        // if (file.size > 512 * 1024) {
        //     return { success: false, error: "Logo must be smaller than 512 KB." };
        // }

        const workspaceId = await getWorkspaceId();

        const [[member], [workspace]] = await Promise.all([
            db
                .select({ role: workspaceMembers.role })
                .from(workspaceMembers)
                .where(
                    and(
                        eq(workspaceMembers.workspaceId, workspaceId),
                        eq(workspaceMembers.userId, user.id)
                    )
                )
                .limit(1),
            db
                .select({ logoKey: workspaces.logoKey })
                .from(workspaces)
                .where(eq(workspaces.id, workspaceId))
                .limit(1),
        ]);

        if (!member || !["owner", "admin"].includes(member.role) || !workspace) {
            return { success: false, error: "Not allowed to update workspace logo." };
        }

        const body = Buffer.from(await file.arrayBuffer());

        const contentType = body
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            ? "image/png"
            : body.length >= 3 &&
            body[0] === 0xff &&
            body[1] === 0xd8 &&
            body[2] === 0xff
                ? "image/jpeg"
                : body.toString("ascii", 0, 4) === "RIFF" &&
                body.toString("ascii", 8, 12) === "WEBP"
                    ? "image/webp"
                    : null;

        if (!contentType) {
            return {
                success: false,
                error: "Logo must be a PNG, JPEG, or WebP image.",
            };
        }

        const { S3_BUCKET } = getServerEnv();

        if (!S3_BUCKET) {
            return { success: false, error: "S3 bucket is not configured." };
        }

        const logoKey = `private/workspaces/${workspaceId}/logos/${randomUUID()}`;
        const rls = await rlsClient();

        await s3.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: logoKey,
                Body: body,
                ContentType: contentType,
            })
        );

        try {
            const [updated] = await rls((tx) =>
                tx
                    .update(workspaces)
                    .set({ logoKey })
                    .where(eq(workspaces.id, workspaceId))
                    .returning({ id: workspaces.id })
            );

            if (!updated) {
                throw new Error("Could not update workspace logo.");
            }
        } catch (error) {
            await s3
                .send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: logoKey }))
                .catch(() => undefined);
            throw error;
        }

        if (
            workspace.logoKey?.startsWith(`private/workspaces/${workspaceId}/logos/`)
        ) {
            await s3
                .send(
                    new DeleteObjectCommand({
                        Bucket: S3_BUCKET,
                        Key: workspace.logoKey,
                    })
                )
                .catch(() => undefined);
        }

        revalidatePath("/w/[wPublicId]/dashboard/platform/workspace", "page");

        return { success: true, message: "Workspace logo updated." };
    });
}


export async function removeWorkspaceLogo(
    _prev: FormState,
    _formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const user = await isSignedIn();
        if (!user) {
            return { success: false, error: "Not authenticated." };
        }

        const workspaceId = await getWorkspaceId();

        const [[member], [workspace]] = await Promise.all([
            db
                .select({ role: workspaceMembers.role })
                .from(workspaceMembers)
                .where(
                    and(
                        eq(workspaceMembers.workspaceId, workspaceId),
                        eq(workspaceMembers.userId, user.id),
                    ),
                )
                .limit(1),
            db
                .select({
                    id: workspaces.id,
                    logoKey: workspaces.logoKey,
                })
                .from(workspaces)
                .where(eq(workspaces.id, workspaceId))
                .limit(1),
        ]);

        if (!member || !["owner", "admin"].includes(member.role)) {
            return { success: false, error: "You cannot manage this workspace logo." };
        }

        if (!workspace?.logoKey) {
            return { success: false, error: "This workspace has no logo." };
        }

        const logoKey = workspace.logoKey;

        if (!logoKey.startsWith(`private/workspaces/${workspaceId}/logos/`)) {
            return { success: false, error: "Invalid workspace logo." };
        }

        const { S3_BUCKET } = getServerEnv();
        if (!S3_BUCKET) {
            return { success: false, error: "S3 bucket is not configured." };
        }

        const rls = await rlsClient();
        const [updated] = await rls((tx) =>
            tx
                .update(workspaces)
                .set({ logoKey: null })
                .where(
                    and(
                        eq(workspaces.id, workspaceId),
                        eq(workspaces.logoKey, logoKey),
                    ),
                )
                .returning({ id: workspaces.id }),
        );

        if (!updated) {
            return { success: false, error: "Logo changed. Refresh and try again." };
        }

        try {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: S3_BUCKET,
                    Key: logoKey,
                }),
            );
        } catch (error) {
            console.error("[workspace-logo] failed to delete old object", error);
        }

        revalidatePath("/w/[wPublicId]/dashboard/platform/workspace", "page");

        return { success: true, message: "Workspace logo removed." };
    });
}
