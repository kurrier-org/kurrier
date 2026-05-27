import {
	fetchIdentityMailboxList,
	fetchMailbox,
	fetchMailboxThreads,
} from "@/lib/actions/mailbox";
import { fetchLabels, fetchMailboxThreadLabels } from "@/lib/actions/labels";
import { getPublicEnv } from "@schema";
import MailPagination from "@/components/mailbox/default/mail-pagination";
import WebmailList from "@/components/mailbox/default/webmail-list";

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
	const resolvedMailboxSlug = mailboxSlug || "inbox";
	const { activeMailbox, count, mailboxSync } = await fetchMailbox(
		identityPublicId,
		resolvedMailboxSlug,
	);

	if (!activeMailbox) {
		return (
			<div className="flex flex-1 flex-col gap-3 p-4">
				<h2 className="text-lg font-semibold">Mailbox is being prepared</h2>
				<p className="max-w-prose text-sm text-muted-foreground">
					The identity exists, but the requested mailbox is not available yet.
					This can happen briefly right after creating a new email identity
					while Kurrier creates the default folders. Refresh this page in a
					moment.
				</p>
			</div>
		);
	}

	const mailboxThreads = await fetchMailboxThreads(
		identityPublicId,
		resolvedMailboxSlug,
		Number(page),
	);

	const labelsByThreadId = await fetchMailboxThreadLabels(mailboxThreads);
	const identityMailboxes = await fetchIdentityMailboxList();
	const globalLabels = await fetchLabels();

	return (
		<>
			<div className="flex flex-1 flex-col gap-4 p-4 mb-12">
				<WebmailList
					mailboxThreads={mailboxThreads}
					publicConfig={publicConfig}
					activeMailbox={activeMailbox}
					identityPublicId={identityPublicId}
					mailboxSync={mailboxSync ?? undefined}
					identityMailboxes={identityMailboxes}
					globalLabels={globalLabels}
					labelsByThreadId={labelsByThreadId}
				/>

				<MailPagination
					key={page}
					count={count}
					mailboxSlug={activeMailbox.slug}
					identityPublicId={identityPublicId}
					page={Number(page)}
				/>
			</div>
		</>
	);
}

export default Page;
