"use server";

import { FormState, handleAction, LabelScope } from "@schema";
import { rlsClient } from "@/lib/actions/clients";
import {
	contactLabels,
	LabelCreate,
	LabelEntity,
	LabelInsertSchema,
	labels,
	MailboxThreadLabelEntity,
	mailboxThreadLabels,
	mailboxThreads,
} from "@db";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { decode } from "decode-formdata";
import slugify from "@sindresorhus/slugify";
import { revalidatePath } from "next/cache";
import { PAGE_SIZE } from "@common/mail-client";
import type { FetchMailboxThreadsResult } from "@/lib/actions/mailbox";

export const fetchLabels = async (scope?: LabelScope) => {
	const selectedScope = scope || "thread";
	const rls = await rlsClient();
	const globalLabels = await rls((tx) =>
		tx
			.select()
			.from(labels)
			.where(sql`${labels.scope} = ${selectedScope}`)
			.orderBy(asc(labels.name)),
	);
	return globalLabels as LabelEntity[];
};

export const fetchLabelsWithCounts = async () => {
	const rls = await rlsClient();

	const allLabels = await rls((tx) =>
		tx
			.select()
			.from(labels)
			.where(sql`${labels.scope} = 'thread'`)
			.orderBy(asc(labels.name)),
	);

	const counts = await rls((tx) =>
		tx
			.select({
				labelId: mailboxThreadLabels.labelId,
				threadCount: sql<number>`count(*)`,
			})
			.from(mailboxThreadLabels)
			.groupBy(mailboxThreadLabels.labelId),
	);

	const countsById = new Map<string, number>();
	for (const row of counts) {
		countsById.set(row.labelId, Number(row.threadCount));
	}

	return allLabels.map((l) => ({
		...l,
		threadCount: countsById.get(l.id) ?? 0,
	}));
};

export type FetchLabelsWithCountResult = Awaited<
	ReturnType<typeof fetchLabelsWithCounts>
>;
export type FetchLabelsResult = Awaited<ReturnType<typeof fetchLabels>>;

export const fetchContactLabelsWithCounts = async () => {
	const rls = await rlsClient();

	const allLabels = await rls((tx) =>
		tx
			.select()
			.from(labels)
			.where(sql`${labels.scope} = 'contact'`)
			.orderBy(asc(labels.name)),
	);

	const counts = await rls((tx) =>
		tx
			.select({
				labelId: contactLabels.labelId,
				contactCount: sql<number>`count(*)`,
			})
			.from(contactLabels)
			.groupBy(contactLabels.labelId),
	);

	const countsById = new Map<string, number>();
	for (const row of counts) {
		countsById.set(row.labelId, Number(row.contactCount));
	}

	return allLabels.map((l) => ({
		...l,
		contactCount: countsById.get(l.id) ?? 0,
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

		const payload = LabelInsertSchema.parse({
			name: decodedForm.name,
			colorBg: decodedForm.color,
			scope: decodedForm.scope,
			slug: slugify(String(decodedForm.name)),
			parentId: decodedForm.parentId ? String(decodedForm.parentId) : undefined,
		});

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
	const threadIds = threads.map((t) => t.threadId);
	if (threadIds.length === 0) return {};
	const rls = await rlsClient();
	const rows = await rls((tx) =>
		tx
			.select({
				mt: mailboxThreadLabels,
				l: labels,
			})
			.from(mailboxThreadLabels)
			.innerJoin(labels, eq(mailboxThreadLabels.labelId, labels.id))
			.where(inArray(mailboxThreadLabels.threadId, threadIds)),
	);

	const byThreadId: Record<
		string,
		{ mt: MailboxThreadLabelEntity; label?: LabelEntity }[]
	> = {};

	for (const { mt, l } of rows) {
		const threadId = mt.threadId;

		if (!byThreadId[threadId]) {
			byThreadId[threadId] = [];
		}

		byThreadId[threadId].push({
			mt,
			label: l,
		});
	}

	return byThreadId;
};

export type FetchMailboxThreadLabelsResult = Awaited<
	ReturnType<typeof fetchMailboxThreadLabels>
>;

export const fetchContactLabelsByContactIds = async (contactIds: string[]) => {
	if (!contactIds?.length) return {};

	const rls = await rlsClient();

	const rows = await rls((tx) =>
		tx
			.select({
				cl: contactLabels,
				l: labels,
			})
			.from(contactLabels)
			.innerJoin(labels, eq(contactLabels.labelId, labels.id))
			.where(inArray(contactLabels.contactId, contactIds)),
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

	const rows = await rls((tx) =>
		tx
			.select({
				mt: mailboxThreads,
			})
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
			.offset((pageNum - 1) * PAGE_SIZE)
			.limit(PAGE_SIZE),
	);

	const [{ total }] = await rls((tx) =>
		tx
			.select({ total: sql<number>`count(*)` })
			.from(mailboxThreadLabels)
			.innerJoin(
				mailboxThreads,
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
			),
	);
	const threads = rows.map((r) => r.mt);
	return { threads, total };
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

	const [existing] = await rls((tx) =>
		tx
			.select()
			.from(labels)
			.where(and(eq(labels.slug, slugify(name)), eq(labels.scope, scope)))
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

		let [favorite] = await rls((tx) =>
			tx
				.select()
				.from(labels)
				.where(and(eq(labels.slug, "favorite"), eq(labels.scope, "contact")))
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
