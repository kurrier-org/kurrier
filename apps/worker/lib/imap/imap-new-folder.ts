import { ImapFlow } from "imapflow";
import { db, mailboxes, mailboxSync } from "@db";
import { eq } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";

async function detectDelimiter(client: ImapFlow): Promise<string> {
	for await (const mbx of await client.list()) {
		if (mbx?.delimiter) return mbx.delimiter;
	}
	return "/"; // safe default
}

function sanitizeName(name: string, delimiter: string) {
	return name.trim().replaceAll(delimiter, " ");
}

export async function addNewFolder(
	data: {
		name: string;
		parentId?: string | null;
		identityId: string;
		ownerId: string;
		kind?: string;
	},
	client: ImapFlow,
) {
	if (!data?.name?.trim()) throw new Error("Folder name is required");

	// Step 1: derive parent info if provided
	let parentPath = "";
	let delimiter = "/";

	if (data.parentId) {
		const [parent] = await db
			.select()
			.from(mailboxes)
			.where(eq(mailboxes.id, data.parentId))
			.limit(1);

		if (parent?.metaData?.imap) {
			parentPath = String(parent.metaData.imap.path ?? "");
			delimiter = String(
				parent.metaData.imap.delimiter ?? (await detectDelimiter(client)),
			);
		} else {
			delimiter = await detectDelimiter(client);
		}
	} else {
		delimiter = await detectDelimiter(client);
	}

	const safeName = sanitizeName(data.name, delimiter);
	const newPath = parentPath
		? `${parentPath}${delimiter}${safeName}`
		: safeName;

	try {
		await client.mailboxCreate(newPath);
	} catch (err: any) {
		if (!/exists|already/i.test(String(err?.message))) throw err;
	}

	try {
		await client.mailboxSubscribe(newPath);
	} catch (_) {}

	const box = await client.mailboxOpen(newPath, { readOnly: true });

	const [row] = await db
		.insert(mailboxes)
		.values({
			ownerId: data.ownerId,
			identityId: data.identityId,
			parentId:
				String(data.parentId)?.trim().length > 0 ? String(data.parentId) : null,
			kind: (data.kind as any) ?? "custom",
			name: safeName,
			slug: slugify(safeName.toLowerCase()),
			isDefault: false,
			metaData: {
				imap: {
					path: newPath,
					name: safeName,
					parentPath,
					delimiter,
					flags: [],
					specialUse: null,
					selectable: true,
				},
			},
		})
		.returning();

	await db.insert(mailboxSync).values({
		identityId: data.identityId,
		mailboxId: row.id,
		uidValidity: box.uidValidity!,
		lastSeenUid: 0,
		backfillCursorUid: Math.max(0, (box.uidNext ?? 1) - 1),
		phase: "IDLE",
		syncedAt: new Date(),
	});

	console.log(
		`✅ Created mailbox "${safeName}" (${newPath}) for ${data.identityId}`,
	);
	return row;
}
