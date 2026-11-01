"use client";

import type { MailboxEntity, MailboxSyncEntity } from "@db";
import { ActionIcon, Button, Tooltip } from "@mantine/core";
import type { PublicConfig } from "@schema";
import { clsx } from "clsx";
import { Mail, MailOpen, RotateCw, Trash2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ReusableFormButton } from "@/components/common/reusable-form-button";
import ComposeMail from "@/components/mailbox/default/compose-mail";
import MoveToFolder from "@/components/mailbox/default/move-to-folder";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import {
	deleteForever,
	deltaFetch,
	type FetchIdentityMailboxListResult,
	type FetchMailboxThreadsResult,
	permanentlyDeleteThreads,
	revalidateMailbox,
	setReadStatus,
	trashThreads,
} from "@/lib/actions/mailbox";

function MailListHeader({
							mailboxThreads,
							mailboxSync,
							publicConfig,
							identityMailboxes,
							activeMailbox,
						}: {
	mailboxThreads: FetchMailboxThreadsResult;
	publicConfig: PublicConfig;
	identityMailboxes: FetchIdentityMailboxListResult;
	activeMailbox: MailboxEntity;
	mailboxSync?: MailboxSyncEntity;
}) {
	const { state, setState } = useDynamicContext<{
		selectedThreadIds: Set<string>;
		activeMailbox?: MailboxEntity | null;
		identityPublicId: string;
	}>();

	const dict = useOptionalDictionary();
	const pathName = usePathname();
	const [reloading, setReloading] = useState(false);

	const selectedThreadIds = Array.from(state?.selectedThreadIds ?? []);
	const hasSelected = selectedThreadIds.length > 0;
	const isTrash = activeMailbox.kind === "trash";

	const isChecked =
		selectedThreadIds.length === mailboxThreads.length &&
		mailboxThreads.length > 0;

	const hasUnread = mailboxThreads.some(
		(thread) =>
			state?.selectedThreadIds?.has(thread.threadId) &&
			thread.unreadCount > 0,
	);

	const readOperation = hasUnread ? "read" : "unread";
	const isOnSnoozedPage = pathName.split("/").includes("snoozed");

	const reload = async () => {
		try {
			setReloading(true);

			if (mailboxSync) {
				await deltaFetch({ identityId: activeMailbox.identityId });
			}

			await revalidateMailbox("/mail");
		} finally {
			setReloading(false);
		}
	};

	const emptyTrash = async () => {
		try {
			await deleteForever(null, activeMailbox.id, true, {
				emptyAll: true,
			});

			toast.success(
				dict?.mailbox?.trashRemoved ?? "Trash removed successfully",
				{ position: "bottom-left" },
			);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to empty Trash",
				{ position: "bottom-left" },
			);
		}
	};

	return (
		<>
			<div className="sticky top-0 z-10 flex min-w-0 items-center rounded-t-2xl bg-background/95 px-3 py-2 backdrop-blur">
				{!isOnSnoozedPage && (
					<input
						type="checkbox"
						onChange={(event) => {
							const newSet = new Set(state?.selectedThreadIds ?? []);

							for (const thread of mailboxThreads) {
								if (event.target.checked) {
									newSet.add(thread.threadId);
								} else {
									newSet.delete(thread.threadId);
								}
							}

							setState((prev) => ({
								...(prev ?? {}),
								selectedThreadIds: newSet,
							}));
						}}
						checked={isChecked}
						aria-label={dict?.mailbox?.selectAll ?? "Select all"}
						className="h-4 w-4 rounded border-muted-foreground/40"
					/>
				)}

				<div className="flex-1" />

				<div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
					<Tooltip label={dict?.mailbox?.sync ?? "Sync"} withArrow>
						<ActionIcon
							variant="subtle"
							onClick={reload}
							loading={reloading}
							title={dict?.mailbox?.sync ?? "Sync"}
							className="h-8 w-8"
						>
							<RotateCw size={16} />
						</ActionIcon>
					</Tooltip>

					<div
						className={clsx(
							"inset-0 flex items-center gap-1 transition-opacity",
							hasSelected
								? "opacity-100"
								: "hidden pointer-events-none opacity-0",
						)}
					>
						<MoveToFolder
							identityMailboxes={identityMailboxes}
							activeMailbox={activeMailbox}
						/>

						<ReusableFormButton
							action={isTrash ? permanentlyDeleteThreads : trashThreads}
							actionIcon
							actionIconProps={{
								variant: "subtle",
								color: "gray",
								size: "compact-sm",
								title: dict?.mailbox?.delete ?? "Delete",
								"aria-label": dict?.mailbox?.delete ?? "Delete",
								children: <Trash2 size={16} />,
							}}
							notify={{
								kind: "toast",
								successMessage: isTrash
									? dict?.mailbox?.threadDeletedForever ??
									"Thread deleted forever"
									: dict?.mailbox?.movedToTrash ??
									"Messages moved to Trash",
								toastProps: { position: "bottom-left" },
							}}
						>
							{selectedThreadIds.map((threadId) => (
								<input
									key={threadId}
									type="hidden"
									name="threadId"
									value={threadId}
								/>
							))}
							<input
								type="hidden"
								name="mailboxId"
								value={activeMailbox.id}
							/>
						</ReusableFormButton>

						<ReusableFormButton
							action={setReadStatus}
							actionIcon
							actionIconProps={{
								variant: "subtle",
								color: "gray",
								size: "compact-sm",
								title: hasUnread
									? dict?.mailbox?.markRead ?? "Mark as read"
									: dict?.mailbox?.markAsUnread ?? "Mark as unread",
								"aria-label": hasUnread
									? dict?.mailbox?.markRead ?? "Mark as read"
									: dict?.mailbox?.markAsUnread ?? "Mark as unread",
								children: hasUnread ? (
									<MailOpen size={16} />
								) : (
									<Mail size={16} />
								),
							}}
						>
							{selectedThreadIds.map((threadId) => (
								<input
									key={threadId}
									type="hidden"
									name="threadId"
									value={threadId}
								/>
							))}
							<input
								type="hidden"
								name="mailboxId"
								value={activeMailbox.id}
							/>
							<input
								type="hidden"
								name="op"
								value={readOperation}
							/>
						</ReusableFormButton>
					</div>

					<div className="md:hidden">
						<ComposeMail
							compact
							publicConfig={publicConfig}
							identityMailboxes={identityMailboxes}
						/>
					</div>
				</div>
			</div>

			{isTrash && (
				<div className="mb-3 mx-2 flex items-center justify-center rounded p-2 text-sm text-muted-foreground">
					<span>
						{dict?.mailbox?.trashRetentionNotice ??
							"Messages that have been in the Trash for more than 30 days will be deleted automatically."}
					</span>

					<AlertDialog>
						<AlertDialogTrigger asChild className="-mx-2">
							<Button variant="transparent">
								{dict?.mailbox?.emptyBinNow ?? "Empty Bin Now"}
							</Button>
						</AlertDialogTrigger>

						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									{dict?.mailbox?.emptyBinConfirmTitle ??
										"Are you absolutely sure?"}
								</AlertDialogTitle>

								<AlertDialogDescription>
									{dict?.mailbox?.emptyBinConfirmDescription ??
										"This action cannot be undone. All messages in Trash will be permanently deleted."}
								</AlertDialogDescription>
							</AlertDialogHeader>

							<AlertDialogFooter>
								<AlertDialogCancel>
									{dict?.common?.cancel ?? "Cancel"}
								</AlertDialogCancel>

								<AlertDialogAction onClick={emptyTrash}>
									{dict?.mailbox?.continue ?? "Continue"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			)}
		</>
	);
}

export default MailListHeader;
