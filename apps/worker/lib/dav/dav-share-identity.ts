import {CalendarEntity, calendars, davAccounts, db, getSecretAdmin, identities, workspaceIdentityMembers} from "@db";
import {and, eq} from "drizzle-orm";
import {createCalendarViaHttp, deleteCalendarViaHttp} from "../../lib/dav/dav-http";
import {davCalendarInstances, davCalendars, davDb} from "../../lib/dav/dav-schema";
import {randomUUID} from "crypto";

type DavContext = {
    baseUrl: string;
    username: string;
    password: string;
    principalUri: string;
};

export const createIdentityCollections = async (data: {
    identityId: string;
    userId: string;
    workspaceId: string;
}, localCalendar: CalendarEntity) => {

    const { identityId, workspaceId} = data;

    const workspaceCtx = await getWorkspaceDavContext(workspaceId);
    const calendarPath = `calendars/${workspaceCtx.username}/${identityId}`;
    const [identity] = await db.select().from(identities).where(eq(identities.id, identityId))

    await createCalendarViaHttp({
        davBaseUrl: workspaceCtx.baseUrl,
        username: workspaceCtx.username,
        password: workspaceCtx.password,
        collectionPath: calendarPath,
        displayName: identity.value,
        description: `Calendar for identity ${identity.value}`,
        timezone: "UTC",
    });

    await shareCalendarCollection(data, localCalendar)
};


export const shareCalendarCollection = async (data: {
    identityId: string;
    userId: string;
    workspaceId: string;
}, localCalendar: CalendarEntity) => {
    const { identityId, workspaceId } = data;
    const workspaceCtx = await getWorkspaceDavContext(workspaceId);
    const [calendarInstance] = await davDb
        .select()
        .from(davCalendarInstances)
        .where(
            and(
                eq(davCalendarInstances.principaluri, workspaceCtx.principalUri),
                eq(davCalendarInstances.uri, identityId)
            )
        )
        .limit(1);

    if (!calendarInstance) {
        throw new Error("Calendar not found for identity");
    }

    const members = await db
        .select()
        .from(workspaceIdentityMembers)
        .where(eq(workspaceIdentityMembers.identityId, identityId));

    const userIds = members.map(m => m.userId);

    if (!userIds.length) return;
    const [identity] = await db.select().from(identities).where(eq(identities.id, identityId))

    for (const uId of userIds) {
        const userCtx = await getUserDavContext(uId);
        const [existing] = await davDb
            .select()
            .from(davCalendarInstances)
            .where(
                and(
                    eq(davCalendarInstances.calendarid, Number(calendarInstance.calendarid)),
                    eq(davCalendarInstances.principaluri, userCtx.principalUri)
                )
            )
            .limit(1);
        if (existing) continue;


        await davDb.insert(davCalendarInstances).values({
            calendarid: calendarInstance.calendarid,
            principaluri: userCtx.principalUri,
            access: 3,
            displayname: identity.value,
            uri: randomUUID(),
            description: calendarInstance.description,
            calendarorder: 0,
            calendarcolor: calendarInstance.calendarcolor,
            timezone: calendarInstance.timezone ?? "UTC",
            transparent: 1,
            share_href: userCtx.principalUri,
            share_displayname: null,
            share_invitestatus: 2,
        });

        const [cal] = await davDb.select().from(davCalendars).where(eq(davCalendars.id, Number(calendarInstance.calendarid))).limit(1);
        await db.update(calendars).set({
            davCalendarId: cal.id,
            davSyncToken: String(cal.synctoken),
        }).where(eq(calendars.id, localCalendar.id));
    }

};


export const davIdentityCleanup = async (data: {
    identityId: string;
    workspaceId: string;
}) => {
    const { identityId, workspaceId } = data;
    const workspaceCtx = await getWorkspaceDavContext(workspaceId);
    const calendarPath = `calendars/${workspaceCtx.username}/${identityId}`;
    const calRes = await deleteCalendarViaHttp({
        davBaseUrl: workspaceCtx.baseUrl,
        username: workspaceCtx.username,
        password: workspaceCtx.password,
        collectionPath: calendarPath,
    });

    await db.delete(identities).where(eq(identities.id, identityId));

    return {
        ok: true,
        calendar: calRes,
    };
};



export const getWorkspaceDavContext = async (
    workspaceId: string,
): Promise<DavContext> => {
    const [account] = await db
        .select()
        .from(davAccounts)
        .where(and(
            eq(davAccounts.workspaceId, workspaceId),
            eq(davAccounts.type, "workspace"),
        ))
        .limit(1);

    if (!account) throw new Error("Workspace DAV account not found");

    const secret = await getSecretAdmin(String(account.secretId));
    const password = secret?.vault?.decrypted_secret;

    if (!password) throw new Error("Workspace DAV password missing");

    return {
        baseUrl: `${process.env.DAV_URL}/dav.php`,
        username: account.username,
        password,
        principalUri: `principals/${account.username}`,
    };
};


export const getUserDavContext = async (
    userId: string,
): Promise<DavContext> => {
    const [account] = await db
        .select()
        .from(davAccounts)
        .where(and(
            eq(davAccounts.ownerId, userId),
            eq(davAccounts.type, "user"),
        ))
        .limit(1);

    if (!account) throw new Error("User DAV account not found");

    const secret = await getSecretAdmin(String(account.secretId));
    const password = secret?.vault?.decrypted_secret;

    if (!password) throw new Error("User DAV password missing");

    return {
        baseUrl: `${process.env.DAV_URL}/dav.php`,
        username: account.username,
        password,
        principalUri: `principals/${account.username}`,
    };
};
