import {db, labels, messages} from "@db";
import {and, eq, sql} from "drizzle-orm";
import {gmailClientForIdentity} from "@providers";


async function getGmailLabelPath(label: typeof labels.$inferSelect): Promise<string> {
    const parts = [label.name];

    let parentId = label.parentId;

    while (parentId) {
        const [parent] = await db
            .select()
            .from(labels)
            .where(eq(labels.id, parentId))
            .limit(1);

        if (!parent) break;

        parts.unshift(parent.name);
        parentId = parent.parentId;
    }

    return parts.join("/");
}

function gmailLabelId(label: typeof labels.$inferSelect) {
    return (label.metaData as any)?.gmail?.labelId as string | undefined;
}


type LabelWithIdentity = typeof labels.$inferSelect & {
    identityId: string;
};

async function getLabelOrThrow(labelId: string): Promise<LabelWithIdentity> {
    const [label] = await db
        .select()
        .from(labels)
        .where(eq(labels.id, labelId))
        .limit(1);

    if (!label) {
        throw new Error(`Label ${labelId} not found`);
    }

    if (!label.identityId) {
        throw new Error(`Label ${labelId} has no identityId`);
    }

    return label as LabelWithIdentity;
}

async function getGmailMessageIdsForThreadMailbox(opts: {
    threadId: string;
    mailboxId: string;
}) {
    const rows = await db
        .select({
            gmailMessageId: sql<string | null>`
				${messages.metaData}->'gmail'->>'messageId'
			`,
        })
        .from(messages)
        .where(
            and(
                eq(messages.threadId, opts.threadId),
                eq(messages.mailboxId, opts.mailboxId),
            ),
        );

    return rows
        .map((r) => r.gmailMessageId)
        .filter((id): id is string => Boolean(id));
}

export async function createGmailLabel(data: { labelId: string }) {
    const label = await getLabelOrThrow(data.labelId);

    const existingGmailLabelId = gmailLabelId(label);
    if (existingGmailLabelId) {
        return {
            labelId: label.id,
            gmailLabelId: existingGmailLabelId,
            skipped: true,
        };
    }

    const { gmail } = await gmailClientForIdentity(label.identityId);

    const gmailName = await getGmailLabelPath(label);
    const created = await gmail.users.labels.create({
        userId: "me",
        requestBody: {
            name: gmailName,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
        },
    });

    const createdLabelId = created.data.id;
    if (!createdLabelId) throw new Error("Gmail returned no label id");

    await db
        .update(labels)
        .set({
            metaData: {
                ...(label.metaData ?? {}),
                gmail: {
                    ...((label.metaData as any)?.gmail ?? {}),
                    labelId: createdLabelId,
                    pendingCreate: false,
                },
            },
            updatedAt: new Date(),
        })
        .where(eq(labels.id, label.id));

    return {
        labelId: label.id,
        gmailLabelId: createdLabelId,
    };
}

export async function updateGmailLabel(data: { labelId: string }) {
    const label = await getLabelOrThrow(data.labelId);

    const gmailId = gmailLabelId(label);
    if (!gmailId) {
        return {
            labelId: label.id,
            skipped: true,
        };
    }
    const { gmail } = await gmailClientForIdentity(label.identityId);
    const gmailName = await getGmailLabelPath(label);
    await gmail.users.labels.update({
        userId: "me",
        id: gmailId,
        requestBody: {
            id: gmailId,
            name: gmailName,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
        },
    });

    await db
        .update(labels)
        .set({
            metaData: {
                ...(label.metaData ?? {}),
                gmail: {
                    ...((label.metaData as any)?.gmail ?? {}),
                    labelId: gmailId,
                    pendingUpdate: false,
                },
            },
            updatedAt: new Date(),
        })
        .where(eq(labels.id, label.id));

    return {
        labelId: label.id,
        gmailLabelId: gmailId,
    };
}


export async function deleteGmailLabel(data: { labelId: string }) {
    const label = await getLabelOrThrow(data.labelId);
    const gmailId = gmailLabelId(label);

    if (!gmailId) {
        return { labelId: label.id, skipped: true };
    }

    const { gmail } = await gmailClientForIdentity(label.identityId);

    try {
        await gmail.users.labels.delete({
            userId: "me",
            id: gmailId,
        });
    } catch (err: any) {
        const status = err?.code ?? err?.status ?? err?.response?.status;
        if (status !== 404) throw err;
    }

    return {
        labelId: label.id,
        gmailLabelId: gmailId,
    };
}

export async function addGmailLabelToThread(data: {
    threadId: string;
    mailboxId: string;
    labelId: string;
}) {
    const label = await getLabelOrThrow(data.labelId);
    const gmailId = gmailLabelId(label);

    if (!gmailId) {
        throw new Error(`Gmail labelId missing for label ${label.id}`);
    }

    const messageIds = await getGmailMessageIdsForThreadMailbox({
        threadId: data.threadId,
        mailboxId: data.mailboxId,
    });

    if (!messageIds.length) {
        return {
            updated: 0,
        };
    }

    const { gmail } = await gmailClientForIdentity(label.identityId);

    for (const messageId of messageIds) {
        await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
                addLabelIds: [gmailId],
            },
        });
    }

    return {
        updated: messageIds.length,
    };
}

export async function removeGmailLabelFromThread(data: {
    threadId: string;
    mailboxId: string;
    labelId: string;
}) {
    const label = await getLabelOrThrow(data.labelId);
    const gmailId = gmailLabelId(label);

    if (!gmailId) {
        return {
            updated: 0,
            skipped: true,
        };
    }

    const messageIds = await getGmailMessageIdsForThreadMailbox({
        threadId: data.threadId,
        mailboxId: data.mailboxId,
    });

    if (!messageIds.length) {
        return {
            updated: 0,
        };
    }

    const { gmail } = await gmailClientForIdentity(label.identityId);

    for (const messageId of messageIds) {
        await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
                removeLabelIds: [gmailId],
            },
        });
    }

    return {
        updated: messageIds.length,
    };
}
