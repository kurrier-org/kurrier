import {db, identities, mailboxes, messages} from "@db";
import {and, eq, inArray} from "drizzle-orm";
import type { MailboxFlagOperation } from "../core";
import { resolveMailboxProvider, type MailboxContext } from "./resolve";
import { MailboxStore } from "./store";
import {LocalMailboxProvider} from "./local";

type FlagInput = {
    threadId: string;
    mailboxId: string;
    op: MailboxFlagOperation;
};

export async function setMailboxFlags(
    input: FlagInput,
    context: MailboxContext,
) {
    const [mailbox] = await db
        .select({ identityId: mailboxes.identityId })
        .from(mailboxes)
        .where(eq(mailboxes.id, input.mailboxId))
        .limit(1);

    if (!mailbox) {
        throw new Error(`Mailbox not found: ${input.mailboxId}`);
    }

    const provider = await resolveMailboxProvider(
        mailbox.identityId,
        context,
    );

    await provider.setFlags(input);

    await MailboxStore.setFlags({
        threadId: input.threadId,
        mailboxId: input.mailboxId,
        op: input.op,
    });
}

export const MailboxService = {
    setFlags: setMailboxFlags,
    moveMessages: moveMailboxMessages,
    deleteMessages: deleteMailboxMessages,
    createFolder: createMailboxFolder,
    deleteFolder: deleteMailboxFolder,
};


type MoveInput = {
    threadId: string;
    mailboxId: string;
    op: "trash" | "archive" | "spam" | "move";
    toMailboxId?: string;
};

export async function moveMailboxMessages(
    input: MoveInput,
    context: MailboxContext,
) {
    const { threadId, mailboxId, op, toMailboxId } = input;

    const [sourceMailbox] = await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.id, mailboxId))
        .limit(1);

    if (!sourceMailbox) {
        throw new Error(`Mailbox not found: ${mailboxId}`);
    }

    if (op === "move" && (!toMailboxId || toMailboxId === mailboxId)) {
        throw new Error("Invalid destination mailbox");
    }

    const [destinationMailbox] = await db
        .select()
        .from(mailboxes)
        .where(
            and(
                eq(mailboxes.identityId, sourceMailbox.identityId),
                op === "move"
                    ? eq(mailboxes.id, toMailboxId!)
                    : eq(mailboxes.kind, op),
            ),
        )
        .limit(1);

    if (!destinationMailbox) {
        throw new Error(`Destination mailbox not found: ${op}`);
    }

    if (sourceMailbox.id === destinationMailbox.id) return;

    const threadMessages = await db
        .select({
            id: messages.id,
            metaData: messages.metaData,
        })
        .from(messages)
        .where(
            and(
                eq(messages.threadId, threadId),
                eq(messages.mailboxId, mailboxId),
            ),
        );

    if (!threadMessages.length) return;

    const provider = await resolveMailboxProvider(
        sourceMailbox.identityId,
        context,
    );

    const destinationPath =
        (destinationMailbox.metaData as any)?.imap?.path ??
        destinationMailbox.name;

    const byPath = new Map<
        string,
        { uids: number[]; messageIds: string[] }
    >();

    const localMessageIds: string[] = [];

    for (const message of threadMessages) {
        const imap = (message.metaData as any)?.imap;
        const uid = Number(imap?.uid);
        const sourcePath = imap?.mailboxPath as string | undefined;

        if (!uid || !sourcePath) {
            localMessageIds.push(message.id);
            continue;
        }

        const group = byPath.get(sourcePath) ?? {
            uids: [],
            messageIds: [],
        };

        group.uids.push(uid);
        group.messageIds.push(message.id);
        byPath.set(sourcePath, group);
    }

    if (provider instanceof LocalMailboxProvider) {
        await MailboxStore.moveMessages({
            threadId,
            sourceMailboxId: mailboxId,
            destinationMailboxId: destinationMailbox.id,
        });

        return;
    }

    if (localMessageIds.length) {
        throw new Error(
            `Missing IMAP UIDs for ${localMessageIds.length} messages in thread ${threadId}`,
        );
    }

    for (const [sourcePath, group] of byPath) {
        const uidMap = await provider.moveMessages({
            sourcePath,
            destinationPath,
            uids: group.uids,
        });

        await MailboxStore.moveMessages({
            threadId,
            sourceMailboxId: mailboxId,
            destinationMailboxId: destinationMailbox.id,
            messageIds: group.messageIds,
            uidMaps: uidMap
                ? new Map([[sourcePath, uidMap]])
                : undefined,
        });
    }
}


type DeleteInput = {
    mailboxId: string;
    threadIds?: string[];
    emptyAll?: boolean;
};

export async function deleteMailboxMessages(
    input: DeleteInput,
    context: MailboxContext,
): Promise<string[]> {
    const { mailboxId, threadIds, emptyAll = false } = input;

    const [mailbox] = await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.id, mailboxId))
        .limit(1);

    if (!mailbox) {
        throw new Error(`Mailbox not found: ${mailboxId}`);
    }

    if (emptyAll && mailbox.kind !== "trash") {
        throw new Error("Empty All is only supported for Trash");
    }

    if (!emptyAll && !threadIds?.length) {
        throw new Error("Thread IDs are required");
    }

    const conditions = [eq(messages.mailboxId, mailboxId)];

    if (!emptyAll) {
        conditions.push(inArray(messages.threadId, threadIds!));
    }

    const rows = await db
        .select({
            threadId: messages.threadId,
            metaData: messages.metaData,
        })
        .from(messages)
        .where(and(...conditions));

    if (!rows.length) return [];

    const affectedThreadIds = [
        ...new Set(rows.map((row) => row.threadId)),
    ];

    const provider = await resolveMailboxProvider(
        mailbox.identityId,
        context,
    );

    if (!(provider instanceof LocalMailboxProvider)) {
        const byPath = new Map<string, number[]>();

        for (const row of rows) {
            const imap = (row.metaData as any)?.imap;
            const uid = Number(imap?.uid);
            const path = imap?.mailboxPath as string | undefined;

            if (!uid || !path) {
                throw new Error(
                    `Missing IMAP UID for thread ${row.threadId}`,
                );
            }

            const uids = byPath.get(path) ?? [];
            uids.push(uid);
            byPath.set(path, uids);
        }

        for (const [mailboxPath, uids] of byPath) {
            await provider.deleteMessages({
                mailboxPath,
                uids,
            });
        }
    }

    await MailboxStore.deleteMessages({
        mailboxId,
        threadIds: affectedThreadIds,
    });

    return affectedThreadIds;
}


type CreateFolderInput = {
    identityId: string;
    name: string;
    parentId?: string | null;
};

export async function createMailboxFolder(
    input: CreateFolderInput,
    context: MailboxContext,
) {
    const [identity] = await db
        .select()
        .from(identities)
        .where(eq(identities.id, input.identityId))
        .limit(1);

    if (!identity) {
        throw new Error(`Identity not found: ${input.identityId}`);
    }

    const name = input.name.trim();

    if (!name) {
        throw new Error("Folder name is required");
    }

    const [parent] = input.parentId
        ? await db
            .select()
            .from(mailboxes)
            .where(
                and(
                    eq(mailboxes.id, input.parentId),
                    eq(mailboxes.identityId, input.identityId),
                ),
            )
            .limit(1)
        : [null];

    if (input.parentId && !parent) {
        throw new Error("Parent mailbox not found");
    }

    const provider = await resolveMailboxProvider(
        input.identityId,
        context,
    );

    const isLocal = provider instanceof LocalMailboxProvider;

    const client = isLocal
        ? undefined
        : await context.getImapClient(input.identityId);

    let delimiter = "/";

    if (client) {
        const folders = await client.list();
        delimiter =
            (parent?.metaData as any)?.imap?.delimiter ??
            folders.find((folder) => folder.delimiter)?.delimiter ??
            "/";
    }

    const safeName = name.replaceAll(delimiter, " ");

    if (!safeName.trim()) {
        throw new Error("Invalid folder name");
    }

    const parentPath = isLocal
        ? parent?.name ?? ""
        : String((parent?.metaData as any)?.imap?.path ?? "");

    if (parent && !parentPath) {
        throw new Error("Parent mailbox has no path");
    }

    const path = parentPath
        ? `${parentPath}${delimiter}${safeName}`
        : safeName;

    const existing = await db
        .select()
        .from(mailboxes)
        .where(eq(mailboxes.identityId, input.identityId));

    const existingFolder = existing.find((folder) =>
        isLocal
            ? folder.parentId === (input.parentId ?? null) &&
            folder.name === safeName
            : (folder.metaData as any)?.imap?.path === path,
    );

    if (existingFolder) {
        return existingFolder;
    }

    try {
        await provider.createFolder({ path });
    } catch (err: any) {
        if (
            isLocal ||
            !/exists|already/i.test(String(err?.message ?? ""))
        ) {
            throw err;
        }
    }

    let imap:
        | { uidValidity: bigint; uidNext: number }
        | undefined;

    if (client) {
        const box = await client.mailboxOpen(path, {
            readOnly: true,
        });

        if (!box.uidValidity) {
            throw new Error(`Missing UIDVALIDITY for ${path}`);
        }

        imap = {
            uidValidity: box.uidValidity,
            uidNext: box.uidNext ?? 1,
        };
    }

    return MailboxStore.createFolder({
        identityId: identity.id,
        ownerId: identity.ownerId,
        workspaceId: identity.workspaceId,
        parentId: input.parentId,
        name: safeName,
        path,
        delimiter,
        imap,
    });
}


type DeleteFolderInput = {
    mailboxId: string;
    identityId: string;
};

export async function deleteMailboxFolder(
    input: DeleteFolderInput,
    context: MailboxContext,
) {
    const [mailbox] = await db
        .select()
        .from(mailboxes)
        .where(
            and(
                eq(mailboxes.id, input.mailboxId),
                eq(mailboxes.identityId, input.identityId),
            ),
        )
        .limit(1);

    if (!mailbox) {
        throw new Error("Mailbox not found");
    }

    if (mailbox.isDefault) {
        throw new Error("Cannot delete a default mailbox");
    }

    const children = await db
        .select({ id: mailboxes.id })
        .from(mailboxes)
        .where(
            and(
                eq(mailboxes.identityId, input.identityId),
                eq(mailboxes.parentId, mailbox.id),
            ),
        )
        .limit(1);

    if (children.length) {
        throw new Error("Folder has subfolders. Delete them first.");
    }

    const provider = await resolveMailboxProvider(
        input.identityId,
        context,
    );

    if (!(provider instanceof LocalMailboxProvider)) {
        const path = (mailbox.metaData as any)?.imap?.path;

        if (!path) {
            throw new Error("Mailbox path missing");
        }

        try {
            await provider.deleteFolder({ path });
        } catch (err: any) {
            if (!/not found|no such|does not exist/i.test(
                String(err?.message ?? ""),
            )) {
                throw err;
            }
        }
    }

    await MailboxStore.deleteFolder(mailbox.id);

    return {
        deletedId: mailbox.id,
    };
}
