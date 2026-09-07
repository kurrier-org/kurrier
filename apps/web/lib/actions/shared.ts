import {rlsClient} from "@/lib/actions/clients";
import {db, users, workspaceMembers, workspaces} from "@db";
import {eq} from "drizzle-orm";
import {revalidatePath} from "next/cache";
import {DISTRIBUTION_ACCESS, WorkspaceAccess} from "@distribution";

export const fetchWorkspace = async () => {
    const rls = await rlsClient();
    const [workspace] = await rls(async (tx) => {
        return tx.select().from(workspaces)
    });
    return workspace;
};

export const fetchWorkspaceMembers = async (id: string) => {
    return await db
        .select({
            workspace_members: workspaceMembers,
            users: {
                id: users.id,
                email: users.email,
                createdAt: users.createdAt,
            },
        })
        .from(workspaceMembers)
        .leftJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, id));
};

export type FetchWorkspaceMembersResult = Awaited<
    ReturnType<typeof fetchWorkspaceMembers>
>;

export const refreshView = async (path: string) => {
    return revalidatePath(path);
};

export const access = async <K extends keyof Omit<WorkspaceAccess, "reason">>(
    key: K,
): Promise<Pick<WorkspaceAccess, K | "reason">> => {
    const workspace = await fetchWorkspace();

    if (!workspace) {
        return {
            [key]: false,
            reason: "Workspace not found",
        } as Pick<WorkspaceAccess, K | "reason">;
    }

    const workspaceAccess =
        await DISTRIBUTION_ACCESS.workspace(workspace.id);

    return {
        [key]: workspaceAccess[key],
        reason: workspaceAccess.reason,
    } as Pick<WorkspaceAccess, K | "reason">;
};
