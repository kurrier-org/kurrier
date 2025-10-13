import {
	deltaFetch,
	fetchMailbox,
	fetchMailboxThreads,
} from "@/lib/actions/mailbox";
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
	const { activeMailbox, count, identity } = await fetchMailbox(
		identityPublicId,
		mailboxSlug,
	);
	if (identity.smtpAccountId) {
		await deltaFetch({ identityId: activeMailbox.identityId });
	}

	const publicConfig = getPublicEnv();
	const mailboxThreads = await fetchMailboxThreads(
		identityPublicId,
		String(mailboxSlug),
		Number(page),
	);

	return (
		<>
			<div className="flex flex-1 flex-col gap-4 p-4 mb-12">
				<WebmailList
					mailboxThreads={mailboxThreads}
					publicConfig={publicConfig}
					activeMailbox={activeMailbox}
					identityPublicId={identityPublicId}
				/>

				<MailPagination
					count={count}
					mailboxSlug={activeMailbox.slug}
					identityPublicId={identityPublicId}
					page={Number(page)}
				/>

				{/*{Array.from({ length: 24 }).map((_, index) => (*/}
				{/*	<div*/}
				{/*		key={index}*/}
				{/*		className="bg-muted/50 aspect-video h-12 w-full rounded-lg"*/}
				{/*	/>*/}
				{/*))}*/}
			</div>
		</>
	);
}

export default Page;
