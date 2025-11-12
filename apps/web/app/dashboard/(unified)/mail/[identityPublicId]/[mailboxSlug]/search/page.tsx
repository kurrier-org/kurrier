import {
	fetchIdentityMailboxList,
	fetchMailbox,
	FetchMailboxThreadsByIdsResult,
	fetchMailboxThreadsList,
	initSearch,
} from "@/lib/actions/mailbox";
import { getPublicEnv, ThreadHit } from "@schema";
import { isSignedIn } from "@/lib/actions/auth";
import SearchPagination from "@/components/mailbox/default/search-pagination";
import WebmailList from "@/components/mailbox/default/webmail-list";

const PAGE_SIZE = 50;

export default async function SearchPage({
	params,
	searchParams,
}: {
	params: { mailboxSlug: string; identityPublicId: string };
	searchParams: Record<string, string | string[] | undefined>;
}) {
	const { identityPublicId, mailboxSlug } = await params;
	const resolvedSearchParams = await searchParams;
	const q = (resolvedSearchParams.q as string) ?? "";
	const has = (resolvedSearchParams.has as string) === "1";
	const unread = (resolvedSearchParams.unread as string) === "1";
	const starred = (resolvedSearchParams.starred as string) === "1";
	const page = Math.max(1, Number((resolvedSearchParams.page as string) ?? 1));

	const { activeMailbox } = await fetchMailbox(identityPublicId, mailboxSlug);
	const publicConfig = await getPublicEnv();

	let items: ThreadHit[] = [];
	let totalThreads = 0;
	let totalMessages = 0;

	if (q.trim()) {
		const user = await isSignedIn();
		const res = await initSearch(
			q,
			String(user?.id),
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

	// DO NOT slice here—items are already page-scoped
	const pageItems = items;

	const threadIds = pageItems.map((i) => i.threadId);
	const { threads } =
		threadIds.length > 0
			? await fetchMailboxThreadsList(activeMailbox.id, threadIds)
			: { threads: [] };

	const identityMailboxes = await fetchIdentityMailboxList();

	return (
		<div className="p-4 space-y-4">
			<header className="flex items-center justify-between">
				<h1 className="text-lg font-semibold">Search</h1>
				<div className="text-sm text-muted-foreground">
					{q.trim()
						? `Threads: ${totalThreads} • Messages: ${totalMessages}`
						: "Type a query to search"}
				</div>
			</header>

			<div className="text-sm text-muted-foreground">
				<span className="font-medium">Query:</span> “{q || "—"}” ·{" "}
				<span className="font-medium">Has attachment:</span>{" "}
				{has ? "Yes" : "No"} · <span className="font-medium">Unread only:</span>{" "}
				{unread ? "Yes" : "No"} ·{" "}
				<span className="font-medium">Starred only:</span>{" "}
				{starred ? "Yes" : "No"}
			</div>

			{!q.trim() ? (
				<div className="text-sm text-muted-foreground">
					Use the global search box above to run a query.
				</div>
			) : pageItems.length === 0 ? (
				<div className="text-sm text-muted-foreground">No results found.</div>
			) : (
				<>
					<WebmailList
						mailboxThreads={
							threads as FetchMailboxThreadsByIdsResult["threads"]
						}
						publicConfig={publicConfig}
						activeMailbox={activeMailbox}
						identityPublicId={identityPublicId}
						identityMailboxes={identityMailboxes}
					/>
				</>
			)}

			{q.trim() && totalPages > 1 && (
				<SearchPagination
					total={total}
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
