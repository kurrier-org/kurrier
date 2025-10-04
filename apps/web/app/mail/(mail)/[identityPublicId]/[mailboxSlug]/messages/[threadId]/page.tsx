import React from "react";
import {
    fetchWebMailThreadDetail,
} from "@/lib/actions/mailbox";
import ThreadItem from "@/components/mailbox/default/thread-item";
import { Divider } from "@mantine/core";

async function Page({
	params,
}: {
	params: { identityPublicId: string; mailboxSlug: string; threadId: string };
}) {
	const { threadId } = await params;
    const activeThread = await fetchWebMailThreadDetail(threadId);

	return (
		<>
			{activeThread?.messages.map((message) => {
				return (
					<div key={message.id}>
						<ThreadItem message={message} />
						<Divider className={"opacity-50 mb-6"} ml={"xl"} mr={"xl"} />
					</div>
				);
			})}
		</>
	);
}

export default Page;
