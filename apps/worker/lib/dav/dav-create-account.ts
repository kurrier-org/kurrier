import {
    addressBooks,
    CalendarInsertSchema,
    calendars,
    createSecretAdmin,
    davAccounts,
    db,
    getSecretAdmin,
    secretsMeta
} from "@db";
import {and, eq, inArray} from "drizzle-orm";
import { randomUUID } from "crypto";
import {
    md5,
    davDb,
    davUsers,
    davAddressbooks,
    davCalendars,
    davCalendarInstances,
    davPrincipals,
} from "../../lib/dav/dav-schema";
import { createAddressBookViaHttp, createCalendarViaHttp } from "./dav-http";
import slugify from "@sindresorhus/slugify";

const DEFAULT_CALENDAR_NAME = "Default Calendar";
const DEFAULT_CALENDAR_SLUG = slugify(DEFAULT_CALENDAR_NAME);
const DEFAULT_CALENDAR_COLOR = "#3b82f6";

// @ts-ignore
const temporaryDelete = async (userId: string): Promise<void> => {
    const [existingDavAccount] = await db
        .select()
        .from(davAccounts)
        .where(eq(davAccounts.ownerId, userId));

    if (!existingDavAccount) return;

    const davUsername = existingDavAccount.username;
    const principalUri = `principals/${davUsername}`;

    await db.delete(addressBooks).where(eq(addressBooks.ownerId, userId));

    await db
        .delete(secretsMeta)
        .where(eq(secretsMeta.id, existingDavAccount.secretId));

    await db.delete(davAccounts).where(eq(davAccounts.ownerId, userId));

    await davDb
        .delete(davAddressbooks)
        .where(eq(davAddressbooks.principaluri, principalUri));

    const calendarInstances = await davDb
        .select()
        .from(davCalendarInstances)
        .where(eq(davCalendarInstances.principaluri, principalUri));

    const calendarIds = calendarInstances
        .map((ci) => ci.calendarid)
        .filter((id): id is number => id != null);

    await davDb
        .delete(davCalendarInstances)
        .where(eq(davCalendarInstances.principaluri, principalUri));

    if (calendarIds.length > 0) {
        await davDb
            .delete(davCalendars)
            .where(inArray(davCalendars.id, calendarIds));
    }

    await davDb
        .delete(davPrincipals)
        .where(eq(davPrincipals.uri, principalUri));

    await davDb.delete(davUsers).where(eq(davUsers.username, davUsername));

    console.log(
        `temporaryDelete: fully wiped DAV + DB state for user ${userId}`,
    );
};





export type DavUserContext = {
    userId: string;
    davUsername: string;
    davPassword: string;
    principalUri: string;
    davAccount: (typeof davAccounts.$inferSelect);
};

async function createDavUser(userId: string): Promise<DavUserContext> {
    const davUsername = `kurrier-${userId}`;
    const davPassword = randomUUID();
    const principalUri = `principals/${davUsername}`;

    const secretName = `dav-${randomUUID()}`;
    const secretIdRow = await createSecretAdmin({
        ownerId: userId,
        name: secretName,
        value: davPassword,
        description: "Auto-generated DAV password",
    });

    const [davAccount] = await db
        .insert(davAccounts)
        .values({
            ownerId: userId,
            secretId: secretIdRow.id,
            username: davUsername,
        })
        .returning();

    const davPasswordHash = await md5(`${davUsername}:BaikalDAV:${davPassword}`);

    const [existingUser] = await davDb
        .select()
        .from(davUsers)
        .where(eq(davUsers.username, davUsername))
        .limit(1);

    if (!existingUser) {
        await davDb.insert(davUsers).values({
            username: davUsername,
            digesta1: davPasswordHash,
        });
    } else if (existingUser.digesta1 !== davPasswordHash) {
        await davDb
            .update(davUsers)
            .set({ digesta1: davPasswordHash })
            .where(eq(davUsers.username, davUsername));
    }

    const [existingPrincipal] = await davDb
        .select()
        .from(davPrincipals)
        .where(eq(davPrincipals.uri, principalUri))
        .limit(1);

    if (!existingPrincipal) {
        await davDb.insert(davPrincipals).values({
            uri: principalUri,
            email: null,
            displayname: "Kurrier",
        });
    }

    return { userId, davUsername, davPassword, principalUri, davAccount };
}




export async function ensureDefaultAddressBook(ctx: DavUserContext) {
    const { userId, davUsername, davPassword, principalUri, davAccount } = ctx;

    const addressbookPath = `addressbooks/${davUsername}/default`;
    const davBaseUrl = `${process.env.DAV_URL}/dav.php`;

    const [existingAddressbook] = await davDb
        .select()
        .from(davAddressbooks)
        .where(
            and(
                eq(davAddressbooks.principaluri, principalUri),
                eq(davAddressbooks.uri, "default"),
            ),
        )
        .limit(1);

    if (!existingAddressbook) {
        const res = await createAddressBookViaHttp({
            davBaseUrl,
            username: davUsername,
            password: davPassword,
            collectionPath: addressbookPath,
            displayName: "Default Address Book",
            description: "Default Address Book for Kurrier",
        });

        console.info(`[DAV] Created addressbook for ${davUsername} status=${res.status}`);
    }

    const [finalAB] = await davDb
        .select()
        .from(davAddressbooks)
        .where(
            and(
                eq(davAddressbooks.principaluri, principalUri),
                eq(davAddressbooks.uri, "default"),
            ),
        )
        .limit(1);

    if (!finalAB) return;

    await db
        .insert(addressBooks)
        .values({
            ownerId: userId,
            davAccountId: davAccount.id,
            davAddressBookId: finalAB.id,
            name: "Default Address Book for Kurrier",
            slug: "default",
            remotePath: addressbookPath,
            isDefault: true,
        })
        .onConflictDoNothing();
}


export async function ensureDefaultCalendar(ctx: DavUserContext) {
    const { userId, davUsername, davPassword, principalUri, davAccount } = ctx;

    const calendarPath = `calendars/${davUsername}/default`;
    const davBaseUrl = `${process.env.DAV_URL}/dav.php`;

    const [existingCalInstance] = await davDb
        .select()
        .from(davCalendarInstances)
        .where(
            and(
                eq(davCalendarInstances.principaluri, principalUri),
                eq(davCalendarInstances.uri, "default"),
            ),
        )
        .limit(1);

    if (!existingCalInstance) {
        const res = await createCalendarViaHttp({
            davBaseUrl,
            username: davUsername,
            password: davPassword,
            collectionPath: calendarPath,
            displayName: DEFAULT_CALENDAR_NAME,
            description: DEFAULT_CALENDAR_NAME,
            timezone: "UTC",
        });

        console.info(`[DAV] Created calendar for ${davUsername} status=${res.status}`);
    }

    const [finalInstance] = await davDb
        .select()
        .from(davCalendarInstances)
        .where(
            and(
                eq(davCalendarInstances.principaluri, principalUri),
                eq(davCalendarInstances.uri, "default"),
            ),
        )
        .limit(1);

    if (!finalInstance) return;

    const [davCalendar] = await davDb
        .select()
        .from(davCalendars)
        .where(eq(davCalendars.id, Number(finalInstance.calendarid)))
        .limit(1);

    if (!davCalendar) return;

    const syncToken =
        davCalendar.synctoken != null ? String(davCalendar.synctoken) : "1";

    const calPayload = CalendarInsertSchema.parse({
        ownerId: userId,
        davAccountId: davAccount.id,
        davCalendarId: finalInstance.calendarid,
        davSyncToken: syncToken,
        remotePath: calendarPath,
        name: DEFAULT_CALENDAR_NAME,
        slug: DEFAULT_CALENDAR_SLUG,
        timezone: finalInstance.timezone || "UTC",
        color: DEFAULT_CALENDAR_COLOR,
        isDefault: true,
    });

    await db.insert(calendars).values(calPayload).onConflictDoNothing();
}


export async function buildContextFromExistingAccount(userId: string): Promise<DavUserContext | null> {
    const [davAccount] = await db
        .select()
        .from(davAccounts)
        .where(eq(davAccounts.ownerId, userId))
        .limit(1);

    if (!davAccount) return null;

    const [secretRow] = await db
        .select({ metaId: secretsMeta.id })
        .from(secretsMeta)
        .where(eq(secretsMeta.id, davAccount.secretId))
        .limit(1);

    const secret = await getSecretAdmin(String(secretRow?.metaId));
    const davPassword = secret?.vault?.decrypted_secret;

    if (!davPassword) {
        console.warn(`[dav-migration] user ${userId}: no DAV password in secret`);
        return null;
    }

    const davUsername = davAccount.username;
    const principalUri = `principals/${davUsername}`;

    return { userId, davUsername, davPassword, principalUri, davAccount };
}

export const createAccount = async (userId: string) => {
    // ONLY FOR TESTING PURPOSES: uncomment to force re-creation of DAV account
    // await temporaryDelete(userId);

    const [existingDavAccount] = await db
        .select()
        .from(davAccounts)
        .where(eq(davAccounts.ownerId, userId))
        .limit(1);

    if (existingDavAccount) return existingDavAccount;

    const ctx = await createDavUser(userId);

    await ensureDefaultAddressBook(ctx);
    await ensureDefaultCalendar(ctx);

    return ctx.davAccount;
};
