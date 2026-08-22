import {
    type jmapAccounts,
    mailboxes,
} from "@db";

import {
    JmapClient,
    type JmapEmail,
} from "@jmap";

import { parseAndStoreEmail } from "../message-payload-parser";

type JmapAccount = typeof jmapAccounts.$inferSelect;
type Mailbox = typeof mailboxes.$inferSelect;

export async function ingestJmapEmail({
                                          client,
                                          account,
                                          workspaceId,
                                          email,
                                          localMailboxByRemoteId,
                                      }: {
    client: JmapClient;
    account: JmapAccount;
    workspaceId: string;
    email: JmapEmail;
    localMailboxByRemoteId: Map<string, Mailbox>;
}) {
    if (!email.blobId) {
        return {
            stored: false,
            mailbox: null,
        };
    }

    const remoteMailboxIds = Object
        .entries(email.mailboxIds ?? {})
        .filter(([, enabled]) => enabled)
        .map(([id]) => id);

    const localMailbox = remoteMailboxIds
        .map((remoteId) =>
            localMailboxByRemoteId.get(remoteId),
        )
        .find(Boolean);

    if (!localMailbox) {
        console.warn(
            `[JMAP] No local mailbox found for email ${email.id}`,
        );

        return {
            stored: false,
            mailbox: null,
        };
    }

    const raw = await client.downloadEmail(
        account.accountId,
        email.blobId,
    );

    const rawMime = Buffer
        .from(raw)
        .toString("utf8");

    await parseAndStoreEmail(
        rawMime,
        {
            ownerId: account.ownerId,
            workspaceId,
            mailboxId: localMailbox.id,
            rawStorageKey:
                `eml/${account.ownerId}/jmap/${email.id}`,
            emlKey: email.id,
        },
    );

    return {
        stored: true,
        mailbox: localMailbox,
    };
}
