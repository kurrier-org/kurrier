import React, { ReactNode } from "react";
import MailboxSearchHeader from "@/components/mailbox/mailbox-search-header";

type LayoutProps = {
	children: ReactNode;
	params: Promise<Record<string, string>>;
};

export default async function DashboardLayout({
	children,
	params,
}: LayoutProps) {

    return <>
        <MailboxSearchHeader params={params} />
        {children}
    </>
}
