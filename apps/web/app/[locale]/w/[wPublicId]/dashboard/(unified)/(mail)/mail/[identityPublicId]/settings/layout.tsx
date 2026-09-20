import {
	Suspense,
	type ReactNode,
} from "react";
import {
	identities,
} from "@db";
import {
	eq,
} from "drizzle-orm";
import {
	Mail,
} from "lucide-react";

import {
	Container,
} from "@/components/common/containers";
import MailboxSearchHeader from "@/components/mailbox/mailbox-search-header";
import SettingsTabs from "@/components/mailbox/settings/settings-tabs";
import {
	getWorkspacePublicId,
	rlsClient,
} from "@/lib/actions/clients";
import {
	getDictionary,
} from "@/lib/dictionaries";

type LayoutProps = {
	children: ReactNode;
	params: Promise<
		Record<string, string>
	>;
};

function MailboxHeaderLoading() {
	return (
		<div className="h-16 animate-pulse border-b border-neutral-200 bg-background dark:border-neutral-800">
			<div className="mx-auto flex h-full items-center px-6">
				<div className="h-9 w-full rounded-lg bg-neutral-100 dark:bg-neutral-800/70" />
			</div>
		</div>
	);
}

function SettingsLayoutLoading() {
	return (
		<Container
			variant="wide"
			className="my-10 animate-pulse"
		>
			<div className="mb-6">
				<div className="h-6 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />

				<div className="mt-2 h-4 w-64 rounded bg-neutral-100 dark:bg-neutral-800/70" />
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
				<div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
					<div className="flex items-center gap-3 px-3 pb-4 pt-2">
						<div className="h-10 w-10 rounded-xl bg-neutral-200 dark:bg-neutral-800" />

						<div className="min-w-0 flex-1 space-y-2">
							<div className="h-4 w-36 rounded bg-neutral-200 dark:bg-neutral-800" />
							<div className="h-3 w-20 rounded bg-neutral-100 dark:bg-neutral-800/70" />
						</div>
					</div>

					<div className="space-y-2">
						<div className="h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800/70" />
						<div className="h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800/70" />
						<div className="h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800/70" />
					</div>
				</div>

				<div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
					<div className="h-5 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />

					<div className="mt-2 h-4 w-72 rounded bg-neutral-100 dark:bg-neutral-800/70" />

					<div className="mt-8 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800/70" />
				</div>
			</div>
		</Container>
	);
}

async function SettingsLayoutContent({
										 children,
										 params,
									 }: LayoutProps) {
	const paramsResolved =
		await params;

	const [
		rls,
		workspacePublicId,
		dict,
	] = await Promise.all([
		rlsClient(),
		getWorkspacePublicId(),
		getDictionary(
			paramsResolved.locale,
		),
	]);

	const [identity] = await rls(
		(tx) =>
			tx
				.select()
				.from(identities)
				.where(
					eq(
						identities.publicId,
						paramsResolved.identityPublicId,
					),
				)
				.limit(1),
	);

	const identityLabel =
		identity?.value;

	return (
		<Container
			variant="wide"
			className="my-10"
		>
			<div className="mb-6">
				<h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
					{dict.platform.settings}
				</h1>

				<p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
					{
						dict.mailbox
							.identitySettingsDescription
					}
				</p>
			</div>

			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
				<div className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
					<div className="px-3 pb-3 pt-2">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand dark:bg-brand/50 dark:text-brand-foreground">
								<Mail size={18} />
							</div>

							<div className="min-w-0">
								<div className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
									{identityLabel}
								</div>

								<div className="truncate text-xs text-neutral-600 dark:text-neutral-400">
									{
										dict.mailbox
											.identity
									}
								</div>
							</div>
						</div>
					</div>

					<SettingsTabs
						workspacePublicId={
							workspacePublicId
						}
					/>
				</div>

				<div className="space-y-6">
					{children}
				</div>
			</div>
		</Container>
	);
}

export default function Layout(
	props: LayoutProps,
) {
	return (
		<>
			<Suspense
				fallback={
					<MailboxHeaderLoading />
				}
			>
				<MailboxSearchHeader
					params={props.params}
				/>
			</Suspense>

			<Suspense
				fallback={
					<SettingsLayoutLoading />
				}
			>
				<SettingsLayoutContent
					{...props}
				/>
			</Suspense>
		</>
	);
}
