import { addressBooks, createSecretAdmin, davAccounts, db } from "@db";
import { and, eq } from "drizzle-orm";
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

export const createAccount = async (userId: string) => {
    const [existingDavAccount] = await db
        .select()
        .from(davAccounts)
        .where(eq(davAccounts.ownerId, userId));

    if (existingDavAccount) return existingDavAccount;

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

    const [newDavAccount] = await db
        .insert(davAccounts)
        .values({
            ownerId: userId,
            secretId: secretIdRow.id,
            username: davUsername,
        })
        .returning();

    const davPasswordHash = await md5(
        `${davUsername}:BaikalDAV:${davPassword}`,
    );

    const [existingUser] = await davDb
        .select()
        .from(davUsers)
        .where(eq(davUsers.username, davUsername));

    if (!existingUser) {
        await davDb.insert(davUsers).values({
            username: davUsername,
            digesta1: davPasswordHash,
        });
    } else {
        if (existingUser.digesta1 !== davPasswordHash) {
            await davDb
                .update(davUsers)
                .set({ digesta1: davPasswordHash })
                .where(eq(davUsers.username, davUsername));
        }
    }

    const [existingPrincipal] = await davDb
        .select()
        .from(davPrincipals)
        .where(eq(davPrincipals.uri, principalUri));

    if (!existingPrincipal) {
        await davDb.insert(davPrincipals).values({
            uri: principalUri,
            email: null,
            displayname: "Kurrier",
        });
    }

    const [existingCalInstance] = await davDb
        .select()
        .from(davCalendarInstances)
        .where(
            and(
                eq(davCalendarInstances.principaluri, principalUri),
                eq(davCalendarInstances.uri, "default"),
            ),
        );

    if (!existingCalInstance) {
        const [calendar] = await davDb
            .insert(davCalendars)
            .values({
                components: "VEVENT,VTODO",
            })
            .returning({ id: davCalendars.id });

        await davDb.insert(davCalendarInstances).values({
            calendarid: calendar.id,
            principaluri: principalUri,
            access: 1,
            displayname: "Default calendar",
            uri: "default",
            description: "Default calendar",
            calendarorder: 0,
            timezone: "Europe/Paris",
            transparent: 0,
            share_invitestatus: 2,
        });
    }

    const [existingAddressbook] = await davDb
        .select()
        .from(davAddressbooks)
        .where(
            and(
                eq(davAddressbooks.principaluri, principalUri),
                eq(davAddressbooks.uri, "default"),
            ),
        );

    let addressBookId: number | null = null;
    if (!existingAddressbook) {
        const [newBook] = await davDb.insert(davAddressbooks).values({
            principaluri: principalUri,
            displayname: "Default Address Book",
            uri: "default",
            description: "Default Address Book for Kurrier",
            synctoken: 1,
        }).returning();
        addressBookId = newBook.id;
    } else {
        addressBookId = existingAddressbook.id;
    }

    const remotePath = `addressbooks/${davUsername}/default`;


    await db
        .insert(addressBooks)
        .values({
            ownerId: userId,
            davAccountId: newDavAccount.id,
            davAddressBookId: addressBookId,
            name: "Default Address Book for Kurrier",
            slug: "default",
            remotePath,
            isDefault: true,
        })
        .onConflictDoNothing();

    return newDavAccount;
};
