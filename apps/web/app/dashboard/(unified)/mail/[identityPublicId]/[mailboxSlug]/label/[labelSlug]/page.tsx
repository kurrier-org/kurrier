import { fetchIdentityMailboxList, fetchMailbox } from "@/lib/actions/mailbox";
import {
	fetchLabels,
	fetchMailboxThreadLabels,
	fetchMailboxThreadsByLabel,
} from "@/lib/actions/labels";
import { getPublicEnv } from "@schema";
import WebmailList from "@/components/mailbox/default/webmail-list";
import LabelPagination from "@/components/dashboard/labels/label-pagination";
import { IconLabelFilled } from "@tabler/icons-react";
import { PAGE_SIZE } from "@common/mail-client";

export default async function LabelPage({
	params,
	searchParams,
}: {
	params: { mailboxSlug: string; identityPublicId: string; labelSlug: string };
	searchParams: Record<string, string | string[] | undefined>;
}) {
	const { identityPublicId, mailboxSlug, labelSlug } = await params;
	const resolvedSearchParams = await searchParams;
	const page = Math.max(
		1,
		Number((resolvedSearchParams.page as string | undefined) ?? 1),
	);
	const { activeMailbox, mailboxSync } = await fetchMailbox(
		identityPublicId,
		mailboxSlug,
	);
	const publicConfig = await getPublicEnv();
	const identityMailboxes = await fetchIdentityMailboxList();
	const globalLabels = await fetchLabels();

	const { threads: mailboxThreads, total } = await fetchMailboxThreadsByLabel(
		identityPublicId,
		mailboxSlug,
		labelSlug,
		page,
	);

	const labelsByThreadId = await fetchMailboxThreadLabels(mailboxThreads);
	const label = globalLabels.find((l) => l.slug === labelSlug);

	return (
		<div className="flex flex-1 flex-col gap-4 p-4 mb-12">
			<header className="flex items-center justify-between">
				<div className="text-sm text-muted-foreground flex items-center gap-2">
					Label:
					<IconLabelFilled size={24} color={String(label?.colorBg)} />
					<span className="font-semibold">{label?.name ?? labelSlug}</span>
				</div>

				{total > 0 && (
					<div className="text-xs text-muted-foreground">
						<span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span>–
						<span className="font-medium">
							{Math.min(page * PAGE_SIZE, total)}
						</span>{" "}
						of <span className="font-semibold">{total}</span>
					</div>
				)}
			</header>

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

			<LabelPagination
				total={total}
				pageSize={PAGE_SIZE}
				page={page}
				identityPublicId={identityPublicId}
				mailboxSlug={mailboxSlug}
				labelSlug={labelSlug}
			/>
		</div>
	);
}
