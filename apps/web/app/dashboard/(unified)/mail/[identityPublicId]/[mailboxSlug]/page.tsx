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
	const { activeMailbox, count, mailboxSync } = await fetchMailbox(
		identityPublicId,
		mailboxSlug,
	);

    // TODO: We have IMAP IDLE detection support in the worker now. We probably don't need this?
	// if (mailboxSync) {
	// 	if (mailboxSync.phase === "IDLE") {
	// 		await deltaFetch({ identityId: activeMailbox.identityId });
	// 	}
	// }

	const publicConfig = getPublicEnv();
	const mailboxThreads = await fetchMailboxThreads(
		identityPublicId,
		String(mailboxSlug),
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
					mailboxSync={mailboxSync}
					identityMailboxes={identityMailboxes}
					globalLabels={globalLabels}
					labelsByThreadId={labelsByThreadId}
				/>

				<MailPagination
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
