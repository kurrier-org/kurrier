import { db, workspaces } from "@db";

export const enforceSingleWorkspace = async () => {
    const existingWorkspace = await db
        .select({ id: workspaces.id })
        .from(workspaces)
        .limit(1);

    if (existingWorkspace.length > 0) {
        throw new Error("This Kurrier instance already has a workspace.");
    }
};
