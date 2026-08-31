import { identities } from "@db";
import { eq } from "drizzle-orm";
import { connection } from "next/server";
import MailboxSearch from "@/components/mailbox/default/mailbox-search";
import IdentitySettingsLink from "@/components/mailbox/settings/identity-settings";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { getWorkspacePublicId, rlsClient } from "@/lib/actions/clients";

async function MailboxSearchHeader({
	params,
}: {
	params: Promise<Record<string, string>>;
}) {
	await connection();

	const { identityPublicId, mailboxSlug } = await params;
	const workspacePublicId = await getWorkspacePublicId();

	const rls = await rlsClient();

	const [identity] = await rls((tx) =>
		tx
			.select({
				value: identities.value,
			})
			.from(identities)
			.where(eq(identities.publicId, identityPublicId)),
	);

	const identityLabel = identity?.value;

	return (
		<header className="sticky top-0 z-50 flex min-w-0 shrink-0 items-center gap-2 border-b bg-background p-2 sm:p-4">
			<SidebarTrigger className="-ml-1" />

			<Separator
				orientation="vertical"
				className="mr-2 data-[orientation=vertical]:h-4"
			/>

			<MailboxSearch
				publicId={identityPublicId}
				mailboxSlug={mailboxSlug}
				workspacePublicId={workspacePublicId}
			/>

			<IdentitySettingsLink
				identityLabel={identityLabel}
				workspacePublicId={workspacePublicId}
			/>
		</header>
	);
}

export default MailboxSearchHeader;
