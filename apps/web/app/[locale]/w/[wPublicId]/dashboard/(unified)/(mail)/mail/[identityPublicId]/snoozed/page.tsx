import {
	fetchMailbox,
	fetchIdentityMailboxList,
	fetchIdentitySnoozedThreads,
} from "@/lib/actions/mailbox";
import { fetchLabels, fetchMailboxThreadLabels } from "@/lib/actions/labels";
import { getPublicEnv } from "@schema";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import WebmailListLabelSearch from "@/components/mailbox/default/webmail-list-label-search";

export default async function SnoozedPage({
	params,
}: {
	params: { identityPublicId: string };
}) {
	const { identityPublicId } = await params;
	const publicConfig = await getPublicEnv();
	const identityMailboxes = await fetchIdentityMailboxList();
	const globalLabels = await fetchLabels();

	const { threads } = await fetchIdentitySnoozedThreads();
	const labelsByThreadId =
		threads.length > 0 ? await fetchMailboxThreadLabels(threads) : {};

	const firstMailboxSlug = threads[0]?.mailboxSlug || "inbox";
	const { activeMailbox } = await fetchMailbox(
		identityPublicId,
		firstMailboxSlug,
	);

	const filteredThreads = threads.filter(
		(thread) => thread.identityPublicId === identityPublicId,
	);

	const workspacePublicId = await getWorkspacePublicId()

	return (
		<div className="p-4 space-y-4">
			<header className="flex items-center justify-between">
				<h1 className="text-lg font-semibold">Snoozed</h1>
				<div className="text-sm text-muted-foreground">
					Threads: {threads.length}
				</div>
			</header>

			{filteredThreads.length === 0 ? (
				<div className="text-sm text-muted-foreground">No snoozed threads.</div>
			) : (
				<WebmailListLabelSearch
					mailboxThreads={filteredThreads}
					publicConfig={publicConfig}
					workspacePublicId={workspacePublicId}
					activeMailbox={activeMailbox}
					identityPublicId={identityPublicId}
					identityMailboxes={identityMailboxes}
					globalLabels={globalLabels}
					labelsByThreadId={labelsByThreadId}
				/>
			)}
		</div>
	);
}
