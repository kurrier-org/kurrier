import React, { useRef, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import {
	deleteForever,
	deltaFetch,
	FetchMailboxThreadsResult,
	markAsRead,
	moveToTrash,
	revalidateMailbox,
} from "@/lib/actions/mailbox";
import { ActionIcon, Button, Tooltip } from "@mantine/core";
import type { MailboxEntity, MailboxSyncEntity } from "@db";
import { toast } from "sonner";
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
import ComposeMail from "@/components/mailbox/default/compose-mail";
import { PublicConfig } from "@schema";
import { useMediaQuery } from "@mantine/hooks";

function MailListHeader({
	mailboxThreads,
	mailboxSync,
	publicConfig,
}: {
	mailboxThreads: FetchMailboxThreadsResult;
	publicConfig: PublicConfig;
	mailboxSync?: MailboxSyncEntity;
}) {
	const { state, setState } = useDynamicContext<{
		selectedThreadIds: Set<string>;
		activeMailbox?: MailboxEntity | null;
		identityPublicId: string;
	}>();

	const identityIdRef = useRef<string | undefined>(
		state?.activeMailbox?.identityId,
	);
	const mailboxIdRef = useRef<string | undefined>(state?.activeMailbox?.id);
	const mailboxKind = useRef<string | undefined>(state?.activeMailbox?.kind);
	useEffect(() => {
		if (state?.activeMailbox?.identityId)
			identityIdRef.current = state.activeMailbox.identityId;
		if (state?.activeMailbox?.id) mailboxIdRef.current = state.activeMailbox.id;
	}, [state?.activeMailbox?.identityId, state?.activeMailbox?.id]);

	const selectedSize = state?.selectedThreadIds?.size ?? 0;
	const hasSelected = selectedSize > 0;
	const isChecked =
		selectedSize === mailboxThreads.length && mailboxThreads.length > 0;

	const [reloading, setReloading] = useState(false);
	const reload = async () => {
		if (mailboxSync) {
			const identityId = identityIdRef.current;
			if (!identityId) return;
			try {
				setReloading(true);
				await deltaFetch({ identityId });
				await revalidateMailbox("/mail");
			} finally {
				setReloading(false);
			}
		} else {
			revalidateMailbox("/mail");
		}
	};

	const markRead = async () => {
		await markAsRead(
			Array.from(state?.selectedThreadIds ?? []),
			String(mailboxIdRef.current),
			!!mailboxSync,
			true,
		);
	};

	const deleteThreads = async () => {
		if (mailboxKind.current === "trash") {
			await removeTrash();
			return;
		}
		await moveToTrash(
			Array.from(state?.selectedThreadIds ?? []),
			String(mailboxIdRef.current),
			!!mailboxSync,
			true,
		);
		toast.success("Messages moved to Trash", { position: "bottom-left" });
	};

	const removeTrash = async () => {
		await deleteForever(
			Array.from(state?.selectedThreadIds ?? []),
			String(mailboxIdRef.current),
			!!mailboxSync,
			true,
		);
		toast.success("Thread deleted forever", { position: "bottom-left" });
	};

	const emptyTrash = async () => {
		await deleteForever(
			null,
			String(mailboxIdRef.current),
			!!mailboxSync,
			true,
			{
				emptyAll: true,
			},
		);
		toast.success("Trash removed successfully", { position: "bottom-left" });
	};

	const isMobile = useMediaQuery("(max-width: 768px)");

	return (
		<>
			<div className="sticky top-0 z-10 flex items-center bg-background/95 px-3 py-2 backdrop-blur rounded-t-2xl">
				{/* Select all checkbox */}
				<input
					type="checkbox"
					onChange={(e) => {
						const newSet = new Set(state?.selectedThreadIds ?? []);
						if (e.target.checked) {
							mailboxThreads.forEach((t) => newSet.add(t.threadId));
						} else {
							mailboxThreads.forEach((t) => newSet.delete(t.threadId));
						}
						setState((prev) => ({
							...(prev ?? {}),
							selectedThreadIds: newSet,
						}));
					}}
					checked={isChecked}
					aria-label="Select all"
					className="h-4 w-4 rounded border-muted-foreground/40"
				/>

				{/* Spacer pushes actions to right */}
				<div className="flex-1" />

				{/* Right actions: reload + compose */}
				<div className="flex items-center gap-2 ml-auto">
					<Tooltip label="Sync" withArrow>
						<ActionIcon
							variant="subtle"
							onClick={reload}
							title="Sync"
							disabled={
								mailboxSync
									? !identityIdRef.current ||
										reloading ||
										mailboxSync?.phase !== "IDLE"
									: !identityIdRef.current || reloading
							}
							className="h-8 w-8"
						>
							<RotateCw className={reloading ? "animate-spin" : ""} size={16} />
						</ActionIcon>
					</Tooltip>

					{isMobile && <ComposeMail publicConfig={publicConfig} />}
				</div>
			</div>

			{mailboxKind.current === "trash" && (
				<div
					className={
						"flex p-2 text-sm text-muted-foreground justify-center mb-3  mx-2 rounded items-center"
					}
				>
					<span>
						Messages that have been in the Trash for more than 30 days will be
						deleted automatically.
					</span>
					<AlertDialog>
						<AlertDialogTrigger asChild={true} className={"-mx-2"}>
							<Button variant={"transparent"}>Empty Bin Now</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
								<AlertDialogDescription>
									This action cannot be undone. This will permanently delete
									your account and remove your data from our servers.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={emptyTrash}>
									Continue
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
