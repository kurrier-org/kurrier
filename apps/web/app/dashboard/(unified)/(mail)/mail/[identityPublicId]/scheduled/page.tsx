import React from "react";
import ScheduledList from "@/components/mailbox/default/scheduled-list";
import { fetchScheduledDrafts } from "@/lib/actions/mailbox";

async function Page(props: {
	params: Promise<{ identityPublicId: string; mailboxSlug: string }>;
}) {
	const { identityPublicId } = await props.params;
	const scheduledDrafts = await fetchScheduledDrafts(identityPublicId);
	return (
		<>
			<div className="p-4">
				<ul role="list" className="divide-y rounded-4xl">
					<ScheduledList drafts={scheduledDrafts} />
				</ul>
			</div>
		</>
	);
}

export default Page;
