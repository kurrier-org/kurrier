import {db, mailboxes} from "@db";
import {and, eq, sql} from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import {gmailClientForIdentity} from "@providers";


function inferGmailKind(labelId?: string | null) {
    switch (labelId) {
        case "INBOX":
            return "inbox";
        case "SENT":
            return "sent";
        case "DRAFT":
            return "drafts";
        case "TRASH":
            return "trash";
        case "SPAM":
            return "spam";
        default:
            return "custom";
    }
}

const IGNORE_LABELS = new Set([
    "CHAT",
    "UNREAD",
    "IMPORTANT",
    "STARRED",
    "YELLOW_STAR",
    "CATEGORY_FORUMS",
    "CATEGORY_UPDATES",
    "CATEGORY_PERSONAL",
    "CATEGORY_PROMOTIONS",
    "CATEGORY_SOCIAL",
]);

export async function discoverGmailMailboxes(job: any) {
    const { identityId, workspaceId } = job.data;
    const { gmail, identity, googleAccount } = await gmailClientForIdentity(identityId, workspaceId);

    const { data } = await gmail.users.labels.list({ userId: "me" });
    const labels = data.labels ?? [];

    for (const label of labels) {
        if (!label.id || !label.name) continue;
        if (IGNORE_LABELS.has(label.id)) continue;

        const [existing] = await db
            .select()
            .from(mailboxes)
            .where(
                and(
                    eq(mailboxes.identityId, identity.id),
                    sql`${mailboxes.metaData}->'gmail'->>'labelId' = ${label.id}`,
                ),
            )
            .limit(1);

        const values = {
            ownerId: identity.ownerId,
            workspaceId: identity.workspaceId,
            identityId: identity.id,
            name: label.name,
            slug: slugify(label.name.toLowerCase()),
            kind: inferGmailKind(label.id),
            isDefault: label.id === "INBOX",
            metaData: {
                gmail: {
                    labelId: label.id,
                    name: label.name,
                    type: label.type,
                    messageListVisibility: label.messageListVisibility ?? null,
                    labelListVisibility: label.labelListVisibility ?? null,
                },
            },
        };

        if (!existing) {
            await db.insert(mailboxes).values(values as any);
        } else {
            await db
                .update(mailboxes)
                .set({ ...values, updatedAt: new Date() } as any)
                .where(eq(mailboxes.id, existing.id));
        }
    }

    console.info(`[GMAIL] Discovered ${labels.length} labels for ${googleAccount.email}`);
}
