import { db, mailboxes, mailboxThreads, messages } from "@db";
import { and, eq, sql } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";

type RenameFolderInput = {
    identityId: string;
    oldPath: string;
    newPath: string;
};

export async function renameMailboxFolder(input: RenameFolderInput) {
    const { identityId, oldPath, newPath } = input;

    if (!oldPath || !newPath || oldPath === newPath) return;

    return db.transaction(async (tx) => {
        const folders = await tx
            .select()
            .from(mailboxes)
            .where(eq(mailboxes.identityId, identityId));

        const folder = folders.find(
            (row) => (row.metaData as any)?.imap?.path === oldPath,
        );

        if (!folder) {
            throw new Error(`Mailbox not found: ${oldPath}`);
        }

        const delimiter =
            (folder.metaData as any)?.imap?.delimiter ?? "/";

        if (newPath.startsWith(`${oldPath}${delimiter}`)) {
            throw new Error("Cannot move a folder into its own subtree");
        }

        const affected = folders.filter((row) => {
            const path = (row.metaData as any)?.imap?.path;

            return (
                path === oldPath ||
                path?.startsWith(`${oldPath}${delimiter}`)
            );
        });

        const affectedIds = new Set(affected.map((row) => row.id));

        const updates = affected.map((row) => {
            const meta = (row.metaData ?? {}) as Record<string, any>;
            const oldRowPath = meta.imap.path as string;

            const path = newPath + oldRowPath.slice(oldPath.length);
            const name = path.split(delimiter).at(-1)!;
            const parentPath = path.includes(delimiter)
                ? path.slice(0, path.lastIndexOf(delimiter))
                : "";

            const parent = folders.find((candidate) => {
                if (candidate.id === row.id) return false;

                const candidatePath =
                    (candidate.metaData as any)?.imap?.path as
                        | string
                        | undefined;

                if (!candidatePath) return false;

                const resolvedPath =
                    candidatePath === oldPath ||
                    candidatePath.startsWith(`${oldPath}${delimiter}`)
                        ? newPath + candidatePath.slice(oldPath.length)
                        : candidatePath;

                return resolvedPath === parentPath;
            });

            if (parentPath && !parent) {
                throw new Error(`Parent mailbox not found: ${parentPath}`);
            }

            return {
                row,
                meta,
                path,
                name,
                parentPath,
                parentId: parent?.id ?? null,
                slug: slugify(name.toLowerCase()),
            };
        });

        for (const update of updates) {
            const conflict = folders.find(
                (candidate) =>
                    !affectedIds.has(candidate.id) &&
                    candidate.slug === update.slug,
            );

            if (conflict) {
                throw new Error(
                    `Mailbox slug already exists: ${update.slug}`,
                );
            }
        }

        const slugs = new Set<string>();

        for (const update of updates) {
            if (slugs.has(update.slug)) {
                throw new Error(
                    `Duplicate mailbox slug: ${update.slug}`,
                );
            }

            slugs.add(update.slug);
        }

        for (const update of updates) {
            const {
                row,
                meta,
                path,
                name,
                parentPath,
                parentId,
                slug,
            } = update;

            await tx
                .update(mailboxes)
                .set({
                    name,
                    slug,
                    parentId,
                    metaData: {
                        ...meta,
                        imap: {
                            ...meta.imap,
                            path,
                            name,
                            parentPath,
                        },
                    },
                    updatedAt: new Date(),
                })
                .where(eq(mailboxes.id, row.id));

            await tx
                .update(mailboxThreads)
                .set({
                    mailboxSlug: slug,
                    updatedAt: new Date(),
                })
                .where(eq(mailboxThreads.mailboxId, row.id));

            await tx
                .update(messages)
                .set({
                    metaData: sql`
                        jsonb_set(
                            COALESCE(${messages.metaData}, '{}'::jsonb),
                        '{imap,mailboxPath}',
                        to_jsonb(${path}::text),
                        true
                        )
                    `,
                })
                .where(
                    and(
                        eq(messages.mailboxId, row.id),
                        sql`${messages.metaData}->'imap'->>'mailboxPath' IS NOT NULL`,
                    ),
                );
        }

        return affected.length;
    });
}
