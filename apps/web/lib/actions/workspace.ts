"use server"

import {getWorkspaceId, rlsClient} from "@/lib/actions/clients";
import {and, eq} from "drizzle-orm";
import {
    db,
    identities,
    UserEntity,
    workspaceIdentityMembers, workspaceMembers, WorkspaceRolesListType, workspaces,
} from "@db";
import {FormState, handleAction} from "@schema";
import {decode} from "decode-formdata";
import {revalidatePath} from "next/cache";
import {users} from "@db";
import { createHash } from "node:crypto";
import {isSignedIn} from "@/lib/actions/auth";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";

import {
    fetchWorkspace as fetchWorkspaceShared,
    fetchWorkspaceMembers as fetchWorkspaceMembersShared,
    refreshView as refreshViewShared
} from "./shared";
import {DISTRIBUTION_CONFIG} from "@distribution";

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
    formData: FormData,
): Promise<FormState> {
    return handleAction(async () => {
        const decodedForm = decode(formData) as Record<string, unknown>;
        const rls = await rlsClient()
        await rls((tx) =>
            tx.update(workspaces).set({name: String(decodedForm.name)})
        );
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


export const updateWorkSpaceContext = async (workspacePublicId: string, id: string, user?: UserEntity) => {
    const cookieStore = await cookies()
    if (!user) {
        user = await isSignedIn() as UserEntity;
    }
    let role: WorkspaceRolesListType = "member"
    const [member] = await db.select().from(workspaceMembers).where(and(
        eq(workspaceMembers.workspaceId, id),
        eq(workspaceMembers.userId, String(user?.id))
    )).limit(1)
    if (member){
        role = member.role as WorkspaceRolesListType
    }
    cookieStore.set({
        name: 'workspaceId',
        value: id,
        httpOnly: true,
        path: '/',
    })
    cookieStore.set({
        name: 'workspacePublicId',
        value: workspacePublicId,
        httpOnly: true,
        path: '/',
    })
    if (role){
        cookieStore.set({
            name: 'workspaceRole',
            value: String(role),
            httpOnly: true,
            path: '/',
        })
    }
};
