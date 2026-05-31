"use server"

import {cache} from "react";
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

export const fetchWorkspace = cache(async () => {
    const rls = await rlsClient();
    const [workspace] = await rls(async (tx) => {
        return tx.select().from(workspaces)
    });
    return workspace;
});


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
        .select()
        .from(workspaceIdentityMembers)
        .leftJoin(users, eq(workspaceIdentityMembers.userId, users.id))
        .where(eq(workspaceIdentityMembers.workspaceId, workspace.id));
};
export type FetchAdminWorkspaceIdentitiesResult = Awaited<
    ReturnType<typeof workspaceIdentityAssignments>
>;

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

export const fetchWorkspaceMembers = async (id: string) => {
    return await db
        .select()
        .from(workspaceMembers)
        .leftJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, id));
};

export type FetchWorkspaceMembersResult = Awaited<
    ReturnType<typeof fetchWorkspaceMembers>
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
        return { success: true, message: "Workspace Updated" };
    });
}

function sha256Hex(input: string) {
    return createHash("sha256").update(input).digest("hex");
}


export const refreshView = async (path: string) => {
    return revalidatePath(path);
};

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
