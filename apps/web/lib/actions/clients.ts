import {currentSession, isSignedIn} from "@/lib/actions/auth";
import {createDrizzleClientInstance, workspaceMembers, workspaces} from "@db";
import {cookies} from "next/headers";
import {and, eq, or} from "drizzle-orm";


export const getWorkspaceId = async () => {
	const cookieStore = await cookies()
	const id = cookieStore.get('workspaceId');
	return String(id?.value)
};

export const getWorkspacePublicId = async () => {
	const cookieStore = await cookies()
	const id = cookieStore.get('workspacePublicId');
	return String(id?.value)
};

export const getWorkspaceRole = async () => {
	const cookieStore = await cookies()
	const id = cookieStore.get('workspaceRole');
	return String(id?.value)
};


export const rlsClient = async () => {
	const cookieStore = await cookies();
	const workspaceId = cookieStore.get("workspaceId")?.value;
	if (!workspaceId) throw new Error("No workspace selected");

	return rlsClientForWorkspace(workspaceId);
};

export const rlsClientForWorkspace = async (workspaceId: string) => {
	const session = await currentSession();
	const user = await isSignedIn();
	const userId = user?.id;
	if (!userId) throw new Error("Not authenticated");

	const { admin } = await createDrizzleClientInstance(session, {});

	const rows = await admin
		.select({ id: workspaces.id })
		.from(workspaces)
		.leftJoin(
			workspaceMembers,
			eq(workspaceMembers.workspaceId, workspaces.id),
		)
		.where(
			and(
				eq(workspaces.id, workspaceId),
				or(
					eq(workspaces.ownerId, userId),
					eq(workspaceMembers.userId, userId),
				),
			),
		)
		.limit(1);

	if (!rows.length) throw new Error("Workspace not found or no access");

	const { rls } = await createDrizzleClientInstance(session, {
		workspaceId,
	});

	return rls;
};
