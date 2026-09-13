import { db, identities } from "@db";
import { eq } from "drizzle-orm";
import { DISTRIBUTION_ACCESS } from "@distribution";

export async function canSyncIdentity(
    identityId: string,
): Promise<boolean> {
    const [identity] = await db
        .select({
            workspaceId: identities.workspaceId,
        })
        .from(identities)
        .where(eq(identities.id, identityId))
        .limit(1);

    if (!identity) {
        return false;
    }

    const access = await DISTRIBUTION_ACCESS.workspace(
        identity.workspaceId,
    );

    return access.canSyncMail;
}
