import React, { type ReactNode } from "react";
import ThreadSlotReset from "@/components/mailbox/default/thread-slot-reset";
import MailboxSearchHeader from "@/components/mailbox/mailbox-search-header";

type LayoutProps = {
	children: ReactNode;
	thread: ReactNode;
	params: Promise<{
		identityPublicId: string;
		mailboxSlug: string;
	}>;
};

export default async function DashboardLayout({
	children,
	thread,
	params,
}: LayoutProps) {
	return (
		<>
			<MailboxSearchHeader params={params} />

			<ThreadSlotReset>{thread}</ThreadSlotReset>
			{children}
		</>
	);
}
