import { calendars, davAccounts, db, identities } from "@db";
import { and, eq } from "drizzle-orm";
import {createIdentityCollections} from "../../../lib/dav/dav-share-identity";

export const davCreateCalendarForIdentity = async (data: {
    identityId: string;
    userId: string;
    workspaceId: string;
}) => {
    const { identityId } = data;

    const {localCalendar} = await db.transaction(async (tx) => {
        const [identity] = await tx
            .select({
                id: identities.id,
                ownerId: identities.ownerId,
                workspaceId: identities.workspaceId,
                publicId: identities.publicId,
                value: identities.value,
            })
            .from(identities)
            .where(eq(identities.id, identityId))
            .limit(1);

        if (!identity) throw new Error(`identity not found: ${identityId}`);

        const [workspaceDav] = await tx
            .select()
            .from(davAccounts)
            .where(and(
                eq(davAccounts.workspaceId, identity.workspaceId),
                eq(davAccounts.type, "workspace"),
            ))
            .limit(1);

        if (!workspaceDav) throw new Error("workspace DAV missing");

        const slug = `identity-${identity.publicId}`;
        const label = identity.value.trim();

        const [localCalendar] = await tx.insert(calendars).values({
            ownerId: identity.ownerId,
            workspaceId: identity.workspaceId,
            davAccountId: workspaceDav.id,
            identityId: identity.id,
            name: label,
            slug,
            timezone: "UTC",
        }).onConflictDoNothing().returning();

        return { ok: true, localCalendar };
    });

    if (localCalendar){
        await createIdentityCollections(data, localCalendar);
    }
    return { ok: true };

};
