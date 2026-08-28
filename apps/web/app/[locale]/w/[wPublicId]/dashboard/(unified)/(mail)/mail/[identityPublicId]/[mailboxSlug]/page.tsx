import { getPublicEnv } from "@schema";
import MailPagination from "@/components/mailbox/default/mail-pagination";
import WebmailList from "@/components/mailbox/default/webmail-list";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import {
	fetchLabelsByIdentityPublicId,
	fetchMailboxThreadLabels,
} from "@/lib/actions/labels";
import {
	fetchIdentityMailboxList,
	fetchMailbox,
	fetchMailboxThreads,
} from "@/lib/actions/mailbox";

async function Page({
	params,
	searchParams,
}: {
	params: { identityPublicId: string; mailboxSlug?: string };
	searchParams: { page?: string };
}) {
	const { page } = await searchParams;
	const { identityPublicId, mailboxSlug } = await params;
	const publicConfig = getPublicEnv();
	const mailboxThreadPromise = fetchMailboxThreads(
		identityPublicId,
		String(mailboxSlug),
		Number(page),
	).then(async (mailboxThreads) => {
		const labelsByThreadId = await fetchMailboxThreadLabels(mailboxThreads);
		return { mailboxThreads, labelsByThreadId };
	});

	const identityMailboxesPromise = fetchIdentityMailboxList();
	const globalLabelsPromise = fetchLabelsByIdentityPublicId({
		identityPublicId,
		scope: "thread",
	});

	const fetchMailboxPromise = fetchMailbox(identityPublicId, mailboxSlug);
	const workspacePublicId = await getWorkspacePublicId();
	return (
		<div className="mb-12 flex min-w-0 flex-1 flex-col gap-4 p-3 sm:p-4">
			<WebmailList
				mailboxThreadPromise={mailboxThreadPromise}
				publicConfig={publicConfig}
				identityPublicId={identityPublicId}
				fetchMailboxPromise={fetchMailboxPromise}
				identityMailboxesPromise={identityMailboxesPromise}
				globalLabelsPromise={globalLabelsPromise}
				workspacePublicId={workspacePublicId}
			/>

			<MailPagination
				key={page}
				workspacePublicId={workspacePublicId}
				fetchMailboxPromise={fetchMailboxPromise}
				identityPublicId={identityPublicId}
				page={Number(page)}
			/>
		</div>
	);
}

export default Page;
