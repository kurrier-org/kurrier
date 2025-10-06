import React from "react";
import {
    fetchWebMailThreadDetail,
} from "@/lib/actions/mailbox";
import ThreadItem from "@/components/mailbox/default/thread-item";
import { Divider } from "@mantine/core";

async function Page({ params }: { params: Promise<{ identityPublicId: string; mailboxSlug: string; threadId: string }> }) {
	const { threadId } = await params;
    const activeThread = await fetchWebMailThreadDetail(threadId);

	return (
		<>

            {activeThread?.messages.map((message, threadIndex) => {
                return (
                    <div key={message.id}>
                        <ThreadItem message={message} threadIndex={threadIndex} numberOfMessages={activeThread.messages.length} />
                        <Divider className={"opacity-50 mb-6"} ml={"xl"} mr={"xl"} />
                    </div>
                );
            })}
		</>
	);
}

export default Page;
