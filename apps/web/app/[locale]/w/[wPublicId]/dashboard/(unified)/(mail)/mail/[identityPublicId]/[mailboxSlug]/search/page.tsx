import { PAGE_SIZE } from "@common/mail-client";
import { getPublicEnv, type ThreadHit } from "@schema";
import SearchPagination from "@/components/mailbox/default/search-pagination";
import WebmailListLabelSearch from "@/components/mailbox/default/webmail-list-label-search";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import {
	fetchLabelsByIdentityPublicId,
	fetchMailboxThreadLabels,
} from "@/lib/actions/labels";
import {
	type FetchMailboxThreadsByIdsResult,
	fetchIdentityMailboxList,
	fetchMailbox,
	fetchMailboxThreadsList,
	initSearch,
} from "@/lib/actions/mailbox";
import { getDictionary, type Locale } from "@/lib/dictionaries";

export default async function SearchPage({
	params,
	searchParams,
}: {
	params: { mailboxSlug: string; identityPublicId: string; locale: Locale };
	searchParams: Record<string, string | string[] | undefined>;
}) {
	const { identityPublicId, mailboxSlug, locale } = await params;
	const dict = await getDictionary(locale);
	const resolvedSearchParams = await searchParams;

	const q = (resolvedSearchParams.q as string) ?? "";
	const has = (resolvedSearchParams.has as string) === "1";
	const unread = (resolvedSearchParams.unread as string) === "1";
	const starred = (resolvedSearchParams.starred as string) === "1";
	const page = Math.max(1, Number((resolvedSearchParams.page as string) ?? 1));

	const workspacePublicId = await getWorkspacePublicId();

	if (!workspacePublicId) {
		return (
			<div className="p-4 text-sm text-muted-foreground">
				{dict.mailbox.missingWorkspaceContext}
			</div>
		);
	}

	const { activeMailbox } = await fetchMailbox(identityPublicId, mailboxSlug);
	const publicConfig = await getPublicEnv();

	let items: ThreadHit[] = [];
	let totalThreads = 0;
	let totalMessages = 0;

	if (q.trim()) {
		const res = await initSearch(
			q,
			workspacePublicId,
			identityPublicId,
			mailboxSlug,
			has,
			unread,
			starred,
			page,
		);

		items = res.items ?? [];
		totalThreads = res.totalThreads ?? items.length;
		totalMessages = res.totalMessages ?? items.length;
	}

	const total = totalThreads || items.length;
	const totalPages = Math.max(1, Math.ceil((total || 1) / PAGE_SIZE));

	const threadIds = items.map((i) => i.threadId);

	const { threads } =
		threadIds.length > 0
			? await fetchMailboxThreadsList(activeMailbox.id, threadIds)
			: { threads: [] };

	const identityMailboxes = await fetchIdentityMailboxList();
	const globalLabels = await fetchLabelsByIdentityPublicId({
		identityPublicId,
		scope: "thread",
	});

	const labelsByThreadId =
		threads.length > 0 ? await fetchMailboxThreadLabels(threads) : {};

	return (
		<div className="p-4 space-y-4">
			<header className="flex items-center justify-between">
				<h1 className="text-lg font-semibold">{dict.mailbox.searchTitle}</h1>
				<div className="text-sm text-muted-foreground">
					{q.trim()
						? `${dict.mailbox.threadsMessagesCountPrefix}${totalThreads}${dict.mailbox.messagesCountMiddle}${totalMessages}`
						: dict.mailbox.typeQueryToSearch}
				</div>
			</header>

			<div className="text-sm text-muted-foreground">
				<span className="font-medium">{dict.mailbox.queryLabel}</span> “
				{q || "—"}” ·{" "}
				<span className="font-medium">{dict.mailbox.hasAttachmentLabel}</span>{" "}
				{has ? dict.common.yes : dict.common.no} ·{" "}
				<span className="font-medium">{dict.mailbox.unreadOnlyLabel}</span>{" "}
				{unread ? dict.common.yes : dict.common.no} ·{" "}
				<span className="font-medium">{dict.mailbox.starredOnlyLabel}</span>{" "}
				{starred ? dict.common.yes : dict.common.no}
			</div>

			{!q.trim() ? (
				<div className="text-sm text-muted-foreground">
					{dict.mailbox.useGlobalSearchBox}
				</div>
			) : items.length === 0 ? (
				<div className="text-sm text-muted-foreground">
					{dict.mailbox.noResultsFound}
				</div>
			) : (
				<WebmailListLabelSearch
					mailboxThreads={threads as FetchMailboxThreadsByIdsResult["threads"]}
					workspacePublicId={workspacePublicId}
					publicConfig={publicConfig}
					activeMailbox={activeMailbox}
					identityPublicId={identityPublicId}
					identityMailboxes={identityMailboxes}
					globalLabels={globalLabels}
					labelsByThreadId={labelsByThreadId}
				/>
			)}

			{q.trim() && totalPages > 1 && (
				<SearchPagination
					key={page}
					total={total}
					workspacePublicId={workspacePublicId}
					pageSize={PAGE_SIZE}
					page={page}
					identityPublicId={identityPublicId}
					mailboxSlug={mailboxSlug}
					q={q}
					has={has}
					unread={unread}
					starred={starred}
				/>
			)}
		</div>
	);
}
