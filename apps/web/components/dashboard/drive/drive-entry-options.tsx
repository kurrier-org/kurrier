"use client";

import { useEffect, useState } from "react";
import type { DriveEntryEntity } from "@db";
import {
	ActionIcon,
	Button,
	Menu,
	Modal,
	Select,
	TextInput, Tooltip,
} from "@mantine/core";
import { Copy, Download, Link2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
	createDriveShareLink,
	deleteDriveEntry,
	getDriveDownloadUrl,
	listDriveShareLinks,
	revokeDriveShareLink,
	type DriveShareDuration,
} from "@/lib/actions/drive";

type ActiveLinks = Awaited<ReturnType<typeof listDriveShareLinks>>;

export default function DriveEntryOptions({
											  entry,
										  }: {
	entry: DriveEntryEntity;
}) {
	const dict = useOptionalDictionary();
	const router = useRouter();

	const [shareOpened, setShareOpened] = useState(false);
	const [duration, setDuration] = useState<DriveShareDuration>("7d");
	const [links, setLinks] = useState<ActiveLinks>([]);
	const [loadingLinks, setLoadingLinks] = useState(false);
	const [creating, setCreating] = useState(false);
	const [revokingId, setRevokingId] = useState<string | null>(null);
	const [createdLink, setCreatedLink] = useState<{
		id: string;
		url: string;
	} | null>(null);

	useEffect(() => {
		if (!shareOpened || entry.type === "folder") return;

		let canceled = false;

		setLoadingLinks(true);

		listDriveShareLinks(entry.id)
			.then((result) => {
				if (!canceled) setLinks(result);
			})
			.catch(() => {
				if (!canceled) {
					toast.error(
						dict?.drive?.shareLinkError ??
						"Could not manage share links.",
					);
				}
			})
			.finally(() => {
				if (!canceled) setLoadingLinks(false);
			});

		return () => {
			canceled = true;
		};
	}, [shareOpened, entry.id, entry.type]);

	const download = async () => {
		try {
			const url = await getDriveDownloadUrl(entry.id);
			window.location.href = url;
		} catch {
			toast.error(dict?.drive?.downloadFailed ?? "Download failed");
		}
	};

	const remove = async () => {
		if (
			!window.confirm(
				`${dict?.drive?.deleteConfirmPrefix ?? 'Delete "'}${entry.name}${dict?.drive?.deleteConfirmSuffix ?? '"?\n\nThis action cannot be undone.'}`,
			)
		) {
			return;
		}

		try {
			const result = await deleteDriveEntry(entry.id);

			if (result.success) {
				toast.success(dict?.drive?.deleted ?? "Deleted");
				router.refresh();
			} else {
				toast.error(dict?.drive?.deleteFailed ?? "Delete failed");
			}
		} catch {
			toast.error(dict?.drive?.deleteFailed ?? "Delete failed");
		}
	};

	const createLink = async () => {
		if (creating) return;

		setCreating(true);

		try {
			const result = await createDriveShareLink(entry.id, duration);

			setCreatedLink({
				id: result.id,
				url: `${window.location.origin}/api/drive/share/${result.token}`,
			});

			setLinks((current) => [
				{
					id: result.id,
					createdAt: new Date().toISOString(),
					expiresAt: result.expiresAt,
				},
				...current,
			]);

			toast.success(
				dict?.drive?.shareLinkCreated ?? "Share link created",
			);
		} catch {
			toast.error(
				dict?.drive?.shareLinkError ?? "Could not manage share links.",
			);
		} finally {
			setCreating(false);
		}
	};

	const copyLink = async () => {
		if (!createdLink) return;

		try {
			await navigator.clipboard.writeText(createdLink.url);
			toast.success(
				dict?.drive?.shareLinkCopied ?? "Link copied",
			);
		} catch {
			toast.error(
				dict?.drive?.shareLinkError ?? "Could not manage share links.",
			);
		}
	};

	const revokeLink = async (linkId: string) => {
		if (
			!window.confirm(
				dict?.drive?.revokeShareLinkConfirm ??
				"Revoke this share link?",
			)
		) {
			return;
		}

		setRevokingId(linkId);

		try {
			await revokeDriveShareLink(entry.id, linkId);

			setLinks((current) =>
				current.filter((link) => link.id !== linkId),
			);

			if (createdLink?.id === linkId) {
				setCreatedLink(null);
			}

			toast.success(
				dict?.drive?.shareLinkRevoked ?? "Share link revoked",
			);
		} catch {
			toast.error(
				dict?.drive?.shareLinkError ?? "Could not manage share links.",
			);
		} finally {
			setRevokingId(null);
		}
	};

	const closeShare = () => {
		setShareOpened(false);
		setCreatedLink(null);
	};

	return (
		<>
			<div className="absolute right-3 top-3 z-10">
				<Menu shadow="md" width={180} position="bottom-end">
					<Menu.Target>
						<ActionIcon
							variant="subtle"
							color="gray"
							aria-label="File options"
						>
							<X className="sr-only" />
							<MoreVerticalIcon />
						</ActionIcon>
					</Menu.Target>

					<Menu.Dropdown>
						{entry.type !== "folder" && (
							<>
								<Menu.Item
									leftSection={<Download size={14} />}
									onClick={download}
								>
									{dict?.drive?.download ?? "Download"}
								</Menu.Item>

								<Menu.Item
									leftSection={<Link2 size={14} />}
									onClick={() => setShareOpened(true)}
								>
									{dict?.drive?.shareFile ?? "Share"}
								</Menu.Item>
							</>
						)}

						<Menu.Item
							color="red"
							leftSection={<Trash2 size={14} />}
							onClick={remove}
						>
							{dict?.drive?.delete ?? "Delete"}
						</Menu.Item>
					</Menu.Dropdown>
				</Menu>
			</div>

			<Modal
				opened={shareOpened}
				onClose={closeShare}
				title={dict?.drive?.shareLinks ?? "Share links"}
				centered
			>
				<div className="space-y-5">
					<div className="flex items-end gap-2">
						<Select
							label={
								dict?.drive?.shareLinkDuration ??
								"Link expires after"
							}
							data={[
								{
									value: "1h",
									label:
										dict?.drive?.shareOneHour ??
										"1 hour",
								},
								{
									value: "1d",
									label:
										dict?.drive?.shareOneDay ??
										"1 day",
								},
								{
									value: "7d",
									label:
										dict?.drive?.shareSevenDays ??
										"7 days",
								},
							]}
							value={duration}
							allowDeselect={false}
							onChange={(value) => {
								if (value) {
									setDuration(value as DriveShareDuration);
								}
							}}
							className="min-w-0 flex-1"
						/>

						<Button onClick={createLink} loading={creating}>
							{dict?.drive?.createShareLink ?? "Create link"}
						</Button>
					</div>

					{createdLink && (
						<div className="space-y-2">
							<TextInput
								label={dict?.drive?.shareLinkCreated ?? "Share link created"}
								value={createdLink.url}
								readOnly
								onFocus={(event) => event.currentTarget.select()}
								rightSectionWidth={48}
								rightSectionPointerEvents="all"
								rightSection={
									<Tooltip label={dict?.drive?.copyShareLink ?? "Copy link"}>
										<ActionIcon
											variant="light"
											size="sm,"
											aria-label={dict?.drive?.copyShareLink ?? "Copy link"}
											onClick={copyLink}
										>
											<Copy size={17} />
										</ActionIcon>
									</Tooltip>
								}
							/>

							<p className="text-xs text-muted-foreground">
								{dict?.drive?.shareLinkCopyNotice ??
									"Copy this link now. It cannot be shown again after closing."}
							</p>
						</div>
					)}

					<div>
						<h3 className="mb-2 text-sm font-medium">
							{dict?.drive?.activeShareLinks ??
								"Active links"}
						</h3>

						{loadingLinks ? (
							<p className="text-sm text-muted-foreground">
								…
							</p>
						) : links.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								{dict?.drive?.noActiveShareLinks ??
									"No active links."}
							</p>
						) : (
							<div className="space-y-2">
								{links.map((link) => (
									<div
										key={link.id}
										className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
									>
										<div className="min-w-0 text-sm">
											<span className="text-muted-foreground">
												{dict?.drive
														?.shareLinkExpires ??
													"Expires"}{" "}
											</span>
											<span>
												{new Intl.DateTimeFormat(
													undefined,
													{
														dateStyle:
															"medium",
														timeStyle:
															"short",
													},
												).format(
													new Date(
														link.expiresAt,
													),
												)}
											</span>
										</div>

										<ActionIcon
											color="red"
											variant="subtle"
											loading={revokingId === link.id}
											aria-label={
												dict?.drive
													?.revokeShareLink ??
												"Revoke link"
											}
											onClick={() =>
												void revokeLink(link.id)
											}
										>
											<X size={16} />
										</ActionIcon>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</Modal>
		</>
	);
}

function MoreVerticalIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<circle cx="12" cy="5" r="1" />
			<circle cx="12" cy="12" r="1" />
			<circle cx="12" cy="19" r="1" />
		</svg>
	);
}
