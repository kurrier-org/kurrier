import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/dashboards/unified/default/app-sidebar";
import { getPublicEnv } from "@schema";
import * as React from "react";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import { Suspense } from "react";
import { connection } from "next/server";
import Loading from "@/app/loading";
import IdentityMailboxesListWrapper from "@/components/dashboard/workspaces/identity-mailboxes-list-wrapper";
import NavUserWrapper from "@/components/ui/dashboards/workspace/nav-user-wrapper";
import { fetchIdentityMailboxList } from "@/lib/actions/mailbox";
import MailComposerLauncher from "@/components/mailbox/default/composer/mail-composer-launcher";

async function MailSidebar() {
	await connection();

	const publicConfig = getPublicEnv();
	const workspacePublicId = await getWorkspacePublicId();
	const identityMailboxes = await fetchIdentityMailboxList();

	const isInbound =
		identityMailboxes[0]?.identity?.metaData?.provider === "inbound";

	return (
		<AppSidebar
			workspacePublicId={workspacePublicId}
			sidebarTopContent={
				<div className="-mt-1" key="mail-sidebar-compose">
					{!isInbound && (
						<MailComposerLauncher
							publicConfig={publicConfig}
							identityMailboxes={identityMailboxes}
						/>
					)}
				</div>
			}
			navUserContent={
				<Suspense fallback={<Loading />}>
					<NavUserWrapper />
				</Suspense>
			}
			sidebarSectionContent={
				<Suspense fallback={<Loading />}>
					<IdentityMailboxesListWrapper />
				</Suspense>
			}
		/>
	);
}

export default function DashboardLayout({
											children,
										}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<Suspense fallback={<Loading />}>
				<MailSidebar />
			</Suspense>

			<SidebarInset>{children}</SidebarInset>
		</>
	);
}
