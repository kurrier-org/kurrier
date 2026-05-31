"use server";

import { FormState, handleAction, LabelScope } from "@schema";
import {getWorkspaceId, rlsClient} from "@/lib/actions/clients";
import {
	contactLabels, db, identities,
	LabelCreate,
	LabelEntity,
	LabelInsertSchema,
	labels,
	MailboxThreadLabelEntity,
	mailboxThreadLabels,
	mailboxThreads, workspaceIdentityMembers,
} from "@db";
import {and, asc, desc, eq, inArray, isNotNull, sql} from "drizzle-orm";
import { decode } from "decode-formdata";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { PAGE_SIZE } from "@common/mail-client";
import type { FetchMailboxThreadsResult } from "@/lib/actions/mailbox";



export const fetchLabelsByIdentityPublicId = async ({
														identityPublicId,
														scope,
													}: {
	identityPublicId: string;
	scope?: LabelScope;
}): Promise<LabelEntity[]> => {
	const rls = await rlsClient();
	const selectedScope = scope ?? "thread";

	const rows = await rls((tx) =>
		tx
			.select({ label: labels })
			.from(labels)
			.innerJoin(
				identities,
				eq(labels.identityId, identities.id)
			)
			.where(
				and(
					eq(identities.publicId, identityPublicId),
					eq(labels.scope, selectedScope),
				)
			)
			.orderBy(asc(labels.name))
	);

	return rows.map((r) => r.label);
};


export const fetchLabels = async (scope?: LabelScope) => {

	const selectedScope = scope || "thread";
	const workspaceId = await getWorkspaceId();

	const globalLabels = await db
		.select()
		.from(labels)
		.where(
			and(
				eq(labels.scope, selectedScope),
				eq(labels.workspaceId, workspaceId),
			),
		)
		.orderBy(asc(labels.name));


	return globalLabels as LabelEntity[];
};

type LabelWithCount = typeof labels.$inferSelect & {
	threadCount: number;
};

export const fetchLabelsWithCounts = async () => {
	const rls = await rlsClient();

	const rows = await rls((tx) =>
		tx
			.select({
				label: labels,
				identityPublicId: identities.publicId,
				threadCount: sql<number>`
          count(${mailboxThreadLabels.threadId})
        `,
			})
			.from(labels)
			.innerJoin(
				identities,
				eq(labels.identityId, identities.id),
			)
			.leftJoin(
				mailboxThreadLabels,
				eq(mailboxThreadLabels.labelId, labels.id),
			)
			.where(
				eq(labels.scope, "thread"),
			)
			.groupBy(labels.id, identities.publicId)
			.orderBy(asc(labels.name))
	);

	const result = new Map<string, LabelWithCount[]>();

	for (const row of rows) {
		const key = row.identityPublicId;

		if (!result.has(key)) {
			result.set(key, []);
		}

		result.get(key)!.push({
			...row.label,
			threadCount: Number(row.threadCount),
		});
	}

	return result;
};

export type FetchLabelsWithCountResult = Awaited<
	ReturnType<typeof fetchLabelsWithCounts>
>;
export type FetchLabelsResult = Awaited<ReturnType<typeof fetchLabels>>;


export const fetchContactLabelsWithCounts = async () => {
	const rls = await rlsClient();

	const rows = await rls((tx) =>
		tx
			.select({
				label: labels,
				contactCount: sql<number>`count(${contactLabels.contactId})`,
			})
			.from(labels)
			.leftJoin(contactLabels, eq(contactLabels.labelId, labels.id))
			.where(eq(labels.scope, "contact"))
			.groupBy(labels.id)
			.orderBy(asc(labels.name))
	);

	return rows.map((r) => ({
		...r.label,
		contactCount: Number(r.contactCount ?? 0),
	}));
};


export type FetchContactLabelsWithCountResult = Awaited<
	ReturnType<typeof fetchContactLabelsWithCounts>
>;

export async function addNewLabel(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		const decodedForm = decode(formData);
		const payloadData = {
			name: decodedForm.name,
			colorBg: decodedForm.color,
			scope: decodedForm.scope,
			slug: slugify(String(decodedForm.name)),
			parentId: decodedForm.parentId ? String(decodedForm.parentId) : undefined,
		}
		const payload = LabelInsertSchema.parse(payloadData);
		if(decodedForm.scope === "thread") {
			const [identity] = await db.select().from(identities).where(eq(identities.publicId, decodedForm.identityPublicId));
			if(!identity) {
				return { success: false, error: "Invalid identity" };
			}
			payload.identityId = identity.id;
		}

		const rls = await rlsClient();
		const newLabelRows = await rls((tx) =>
			tx
				.insert(labels)
				.values(payload as LabelCreate)
				.returning(),
		);

		const scope = decodedForm.scope as LabelScope;

		if (scope === "contact" || scope === "all") {
			revalidatePath("/dashboard/contacts");
		}
		if (scope === "thread" || scope === "all") {
			revalidatePath("/dashboard/mail");
		}
		return { success: true, data: newLabelRows };
	});
}

export async function addLabelToThread({
										   threadId,
										   mailboxId,
										   labelId,
									   }: {
	threadId: string;
	mailboxId: string;
	labelId: string;
}): Promise<FormState> {
	return handleAction(async () => {
		const rls = await rlsClient();
		await rls((tx) =>
			tx.insert(mailboxThreadLabels).values({
				threadId,
				mailboxId,
				labelId,
			}),
		);
		revalidatePath("/dashboard/mail");
		return { success: true };
	});
}

export async function removeLabelFromThread({
												threadId,
												mailboxId,
												labelId,
											}: {
	threadId: string;
	mailboxId: string;
	labelId: string;
}): Promise<FormState> {
	return handleAction(async () => {
		const rls = await rlsClient();
		await rls((tx) =>
			tx
				.delete(mailboxThreadLabels)
				.where(
					and(
						eq(mailboxThreadLabels.threadId, threadId),
						eq(mailboxThreadLabels.mailboxId, mailboxId),
						eq(mailboxThreadLabels.labelId, labelId),
					),
				)
				.returning(),
		);
		revalidatePath("/dashboard/mail");
		return { success: true };
	});
}

export async function addLabelToContact({
											contactId,
											labelId,
										}: {
	contactId: string;
	labelId: string;
}): Promise<FormState> {
	return handleAction(async () => {
		const rls = await rlsClient();
		await rls((tx) =>
			tx.insert(contactLabels).values({
				contactId,
				labelId,
			}),
		);

		// contacts sidebar / list
		revalidatePath("/dashboard/contacts");
		return { success: true };
	});
}

export async function removeLabelFromContact({
												 contactId,
												 labelId,
											 }: {
	contactId: string;
	labelId: string;
}): Promise<FormState> {
	return handleAction(async () => {
		const rls = await rlsClient();
		await rls((tx) =>
			tx
				.delete(contactLabels)
				.where(
					and(
						eq(contactLabels.contactId, contactId),
						eq(contactLabels.labelId, labelId),
					),
				)
				.returning(),
		);

		revalidatePath("/dashboard/contacts");
		return { success: true };
	});
}




export const fetchMailboxThreadLabels = async (
	threads: FetchMailboxThreadsResult,
) => {
	const rls = await rlsClient();
	const threadIds = threads.map((t) => t.threadId).filter(Boolean);
	if (!threadIds.length) return {};

	const rows = await rls((tx) =>
		tx
			.select({
				mt: mailboxThreadLabels,
				l: labels,
			})
			.from(mailboxThreadLabels)
			.innerJoin(labels, eq(mailboxThreadLabels.labelId, labels.id))
			.where(inArray(mailboxThreadLabels.threadId, threadIds))
	);

	const byThreadId: Record<string, any[]> = {};

	for (const { mt, l } of rows) {
		if (!byThreadId[mt.threadId]) byThreadId[mt.threadId] = [];
		byThreadId[mt.threadId].push({ mt, label: l });
	}

	return byThreadId;
};


export type FetchMailboxThreadLabelsResult = Awaited<
	ReturnType<typeof fetchMailboxThreadLabels>
>;

export const fetchContactLabelsByContactIds = async (contactIds: string[]) => {
	if (!contactIds?.length) return {};

	const rls = await rlsClient();
	const workspaceId = await getWorkspaceId();
	const rows = await rls((tx) =>
		tx
			.select({
				cl: contactLabels,
				l: labels,
			})
			.from(contactLabels)
			.innerJoin(labels, eq(contactLabels.labelId, labels.id))
			.where(and(
				inArray(contactLabels.contactId, contactIds),
				eq(contactLabels.workspaceId, workspaceId),
			))
	);

	const byContactId: Record<string, { label: LabelEntity }[]> = {};

	for (const { cl, l } of rows) {
		const contactId = cl.contactId;

		if (!byContactId[contactId]) {
			byContactId[contactId] = [];
		}

		byContactId[contactId].push({ label: l });
	}

	return byContactId;
};

export type FetchContactLabelsByIdResult = Awaited<
	ReturnType<typeof fetchContactLabelsByContactIds>
>;


export const fetchMailboxThreadsByLabel = async (
	identityPublicId: string,
	mailboxSlug: string,
	labelSlug: string,
	page: number,
) => {
	const rls = await rlsClient();
	const pageNum = page && page > 0 ? page : 1;
	const offset = (pageNum - 1) * PAGE_SIZE;

	const rows = await rls((tx) =>
		tx
			.select({ thread: mailboxThreads })
			.from(mailboxThreads)
			.innerJoin(
				mailboxThreadLabels,
				and(
					eq(mailboxThreadLabels.threadId, mailboxThreads.threadId),
					eq(mailboxThreadLabels.mailboxId, mailboxThreads.mailboxId),
				),
			)
			.innerJoin(labels, eq(mailboxThreadLabels.labelId, labels.id))
			.where(
				and(
					eq(mailboxThreads.identityPublicId, identityPublicId),
					eq(mailboxThreads.mailboxSlug, mailboxSlug),
					eq(labels.slug, labelSlug),
				),
			)
			.orderBy(desc(mailboxThreads.lastActivityAt))
			.offset(offset)
			.limit(PAGE_SIZE)
	);

	const [{ total }] = await rls((tx) =>
		tx
			.select({ total: sql<number>`count(*)` })
			.from(mailboxThreads)
			.innerJoin(
				mailboxThreadLabels,
				and(
					eq(mailboxThreadLabels.threadId, mailboxThreads.threadId),
					eq(mailboxThreadLabels.mailboxId, mailboxThreads.mailboxId),
				),
			)
			.innerJoin(labels, eq(mailboxThreadLabels.labelId, labels.id))
			.where(
				and(
					eq(mailboxThreads.identityPublicId, identityPublicId),
					eq(mailboxThreads.mailboxSlug, mailboxSlug),
					eq(labels.slug, labelSlug),
				),
			)
	);

	return {
		threads: rows.map((r) => r.thread),
		total: Number(total ?? 0),
	};
};

export type FetchMailboxThreadsByLabelResult = Awaited<
	ReturnType<typeof fetchMailboxThreadsByLabel>
>;

export const deleteLabel = async ({ id }: { id: string }) => {
	try {
		const rls = await rlsClient();

		await rls((tx) => tx.delete(labels).where(eq(labels.id, id)));
		revalidatePath("/dashboard");
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err?.message ?? "Unknown error" };
	}
};

export const updateLabel = async ({
									  id,
									  name,
									  parentId,
									  color,
								  }: {
	id: string;
	name: string;
	parentId: string | null;
	color: string;
}) => {
	try {
		const rls = await rlsClient();

		await rls((tx) =>
			tx
				.update(labels)
				.set({
					name,
					parentId,
					colorBg: color,
					updatedAt: new Date(),
				})
				.where(eq(labels.id, id)),
		);

		revalidatePath("/dashboard");
		return { success: true };
	} catch (err: any) {
		return { success: false, error: err?.message ?? "Unknown error" };
	}
};

export async function getOrCreateSystemLabel({
												 name,
												 scope,
												 colorBg,
											 }: {
	name: string;
	scope: LabelScope;
	colorBg?: string | null;
}): Promise<LabelEntity> {
	const rls = await rlsClient();
	const workspaceId = await getWorkspaceId();
	const [existing] = await rls((tx) =>
		tx
			.select()
			.from(labels)
			.where(and(
				eq(labels.slug, slugify(name)),
				eq(labels.scope, scope),
				eq(labels.workspaceId, workspaceId),
			))
			.limit(1),
	);

	if (existing) return existing as LabelEntity;

	const payload = LabelInsertSchema.parse({
		name,
		slug: slugify(name),
		isSystem: true,
		scope,
		colorBg: colorBg ?? null,
		parentId: undefined,
	});


	const [inserted] = await rls((tx) =>
		tx
			.insert(labels)
			.values(payload as LabelCreate)
			.returning(),
	);

	return inserted as LabelEntity;
}

export async function toggleFavoriteContact(formData: FormData) {
	await handleAction(async () => {
		const decodedForm = decode(formData);
		const contactId = String(decodedForm.contactId);
		const rls = await rlsClient();
		const workspaceId = await getWorkspaceId();
		let [favorite] = await rls((tx) =>
			tx
				.select()
				.from(labels)
				.where(and(
					eq(labels.slug, "favorite"),
					eq(labels.scope, "contact"),
					eq(labels.workspaceId, workspaceId),
				))
				.limit(1),
		);

		if (!favorite) {
			const rows = await rls((tx) =>
				tx
					.insert(labels)
					.values({
						name: "Favorite",
						slug: "favorite",
						scope: "contact",
						isSystem: true,
						colorBg: "#eab308",
					})
					.returning(),
			);
			favorite = rows[0];
		}

		const existing = await rls((tx) =>
			tx
				.select()
				.from(contactLabels)
				.where(
					and(
						eq(contactLabels.contactId, contactId),
						eq(contactLabels.labelId, favorite.id),
					),
				)
				.limit(1),
		);

		if (existing.length) {
			await rls((tx) =>
				tx
					.delete(contactLabels)
					.where(
						and(
							eq(contactLabels.contactId, contactId),
							eq(contactLabels.labelId, favorite.id),
						),
					),
			);

			revalidatePath("/dashboard/contacts");
			return { success: true, isFavorite: false };
		}

		await rls((tx) =>
			tx.insert(contactLabels).values({
				contactId,
				labelId: favorite.id,
			}),
		);

		revalidatePath("/dashboard/contacts");
		return { success: true, isFavorite: true };
	});
}
