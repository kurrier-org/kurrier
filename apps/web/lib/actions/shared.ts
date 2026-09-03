import {rlsClient} from "@/lib/actions/clients";
import {db, users, workspaceMembers, workspaces} from "@db";
import {eq} from "drizzle-orm";

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
