// @ts-nocheck
"use client";

import { getMessageAddress, getMessageName } from "@common/mail-client";
import type { MessageAttachmentEntity, MessageEntity } from "@db";
import { Temporal } from "@js-temporal/polyfill";
import { ActionIcon, Button, Menu, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { PublicConfig } from "@schema";
import slugify from "@sindresorhus/slugify";
import {
	Code,
	Download,
	EllipsisVertical,
	Forward,
	Reply,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import ThreadLabelHoverButtons from "@/components/dashboard/labels/thread-label-hover-buttons";
import MailComposer from "@/components/mailbox/default/composer/mail-composer";
import EditorAttachmentItem from "@/components/mailbox/default/editor/editor-attachment-item";
import MailUnsubscriber from "@/components/mailbox/default/mail-unsubscriber";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

import type {
	FetchLabelsResult,
	FetchMailboxThreadLabelsResult,
} from "@/lib/actions/labels";
import {
	type FetchIdentityMailboxListResult,
	type FetchThreadMailSubsResult,
	markAsRead,
} from "@/lib/actions/mailbox";
import { getRawMessageDownloadUrl } from "@/lib/actions/uploads-actions";

const InspectorBar = dynamic(
	() => import("@/components/dashboard/inspector/inspector-bar"),
	{
		ssr: true,
		loading: () => (
			<div className="my-5 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
				Loading message inspector…
			</div>
		),
	},
);

export type MessageAttachmentWithUrl = MessageAttachmentEntity & {
	signedUrl: string;
};

type ComposerMode = "reply" | "forward";

function getScrollParent(el: HTMLElement): HTMLElement {
	let parent: HTMLElement | null = el.parentElement;

	while (parent) {
		const style = getComputedStyle(parent);
		const overflowY = style.overflowY || style.overflow;

		const canScrollY =
			(overflowY === "auto" || overflowY === "scroll") &&
			parent.scrollHeight > parent.clientHeight;

		if (canScrollY) {
			return parent;
		}

		parent = parent.parentElement;
	}

	return (
		document.scrollingElement || document.documentElement
	) as HTMLElement;
}

export function scrollToEditor(
	el: HTMLElement,
	{
		offsetTop = 96,
		minBottomGap = 48,
	}: {
		offsetTop?: number;
		minBottomGap?: number;
	} = {},
) {
	const container = getScrollParent(el);

	const isWindow =
		container ===
		(document.scrollingElement as HTMLElement);

	const containerRect = isWindow
		? ({
			top: 10,
			height: window.innerHeight,
		} as DOMRect)
		: container.getBoundingClientRect();

	const editorRect = el.getBoundingClientRect();

	const currentTop = isWindow
		? window.scrollY
		: container.scrollTop;

	const targetTop =
		currentTop +
		(editorRect.top - containerRect.top) -
		offsetTop;

	const doScroll = (top: number) => {
		if (isWindow) {
			window.scrollTo({
				top,
				behavior: "smooth",
			});
		} else {
			container.scrollTo({
				top,
				behavior: "smooth",
			});
		}
	};

	doScroll(targetTop);

	setTimeout(() => {
		const editorRectAfterScroll =
			el.getBoundingClientRect();

		const viewHeight = isWindow
			? window.innerHeight
			: container.clientHeight;

		const bottomGap =
			viewHeight - editorRectAfterScroll.bottom;

		if (bottomGap < minBottomGap) {
			const delta =
				minBottomGap - bottomGap;

			if (isWindow) {
				window.scrollBy({
					top: delta,
					behavior: "smooth",
				});
			} else {
				container.scrollBy({
					top: delta,
					behavior: "smooth",
				});
			}
		}
	}, 120);
}

function EmailRenderer({
						   threadIndex,
						   numberOfMessages,
						   message,
						   attachments,
						   publicConfig,
						   threadId,
						   markSmtp,
						   activeMailboxId,
						   mailSubscription,
						   identityMailboxes,
						   allLabels,
						   labelsByThreadId,
						   children,
					   }: {
	threadIndex: number;
	numberOfMessages: number;
	message: MessageEntity;
	attachments: MessageAttachmentWithUrl[];
	publicConfig: PublicConfig;
	threadId: string;
	markSmtp: boolean;
	activeMailboxId: string;
	mailSubscription: FetchThreadMailSubsResult["byMessageId"] | null;
	identityMailboxes: FetchIdentityMailboxListResult;
	allLabels: FetchLabelsResult;
	labelsByThreadId: FetchMailboxThreadLabelsResult;
	children?: React.ReactNode;
}) {
	const dict = useOptionalDictionary();
	const params = useParams();

	const composerRef = useRef<HTMLDivElement>(null);

	const formatted = Temporal.Instant.from(
		message.createdAt.toISOString(),
	)
		.toZonedDateTimeISO(Temporal.Now.timeZoneId())
		.toLocaleString("en-US", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});

	const [showEditor, setShowEditor] =
		useState(false);

	const [showEditorMode, setShowEditorMode] =
		useState<ComposerMode>("reply");

	useEffect(() => {
		if (activeMailboxId) {
			markAsRead(
				threadId,
				activeMailboxId,
				markSmtp,
				true,
			);
		}
	}, [activeMailboxId, threadId, markSmtp]);

	useEffect(() => {
		if (!showEditor) return;

		requestAnimationFrame(() => {
			const el = composerRef.current;

			if (!el) return;

			scrollToEditor(el, {
				offsetTop: 96,
				minBottomGap: 64,
			});
		});
	}, [showEditor, showEditorMode]);

	const downloadEml = async () => {
		const { url } =
			await getRawMessageDownloadUrl(
				message.id,
			);

		if (url) {
			window.open(url, "_blank");
		}
	};

	const [opened, { open, close }] =
		useDisclosure(false);

	const [emailString, setEmailString] =
		useState<string | null>(null);

	useEffect(() => {
		if (!opened) return;

		getRawMessageDownloadUrl(
			message.id,
		).then(({ url }) => {
			if (!url) return;

			fetch(url)
				.then((res) => res.text())
				.then((raw) =>
					setEmailString(
						raw.slice(0, 10000),
					),
				);
		});
	}, [opened, message.id]);

	const formattedTime = useMemo(() => {
		return Temporal.Instant.from(
			message.createdAt.toISOString(),
		)
			.toZonedDateTimeISO(
				Temporal.Now.timeZoneId(),
			)
			.toLocaleString("en-GB", {
				day: "numeric",
				month: "long",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: false,
			})
			.replace(",", " at");
	}, [message.createdAt]);

	const activeIdentityPublicId =
		useMemo(() => {
			const routeIdentityPublicId =
				String(
					params.identityPublicId ??
					"",
				);

			const exists =
				identityMailboxes.some(
					(item) =>
						item.identity
							.publicId ===
						routeIdentityPublicId,
				);

			if (exists) {
				return routeIdentityPublicId;
			}

			return identityMailboxes[0]
				?.identity.publicId;
		}, [
			params.identityPublicId,
			identityMailboxes,
		]);

	const openComposer = (
		mode: ComposerMode,
	) => {
		setShowEditorMode(mode);
		setShowEditor(true);
	};

	return (
		<>
			<Modal
				opened={opened}
				onClose={close}
				title={
					dict?.mailbox
						?.originalMessage ??
					"Original message"
				}
				size="xl"
			>
				<div className="overflow-hidden rounded-md border text-sm">
					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							{dict?.mailbox
									?.messageId ??
								"Message ID"}
						</div>

						<div className="break-all px-3 py-2 text-green-700">
							{message.messageId}
						</div>
					</div>

					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							{dict?.mailbox
									?.createdOn ??
								"Created on"}
						</div>

						<div className="px-3 py-2">
							{formattedTime}
						</div>
					</div>

					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							{dict?.mailbox
									?.from ??
								"From"}
						</div>

						<div className="px-3 py-2">
							{String(
								message
									?.headersJson
									?.from
									?.text,
							)}
						</div>
					</div>

					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							{dict?.mailbox?.to ??
								"To"}
						</div>

						<div className="px-3 py-2">
							{String(
								message
									?.headersJson
									?.to
									?.text,
							)}
						</div>
					</div>

					<div className="grid grid-cols-[160px_1fr]">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							{dict?.mailbox
									?.subject ??
								"Subject"}
						</div>

						<div className="px-3 py-2">
							{
								message
									?.headersJson
									?.subject
							}
						</div>
					</div>
				</div>

				<div
					className="
						mt-4 overflow-x-auto whitespace-pre-wrap break-words
						rounded-md border border-neutral-200 bg-neutral-50
						p-4 font-mono text-sm text-neutral-800 shadow-sm
						dark:border-neutral-800 dark:bg-neutral-900
						dark:text-neutral-200
					"
				>
					{emailString ||
						(dict?.mailbox
								?.loadingRawMessage ??
							"Loading raw message...")}
				</div>
			</Modal>

			<div className="grid grid-cols-12">
				<div className="col-span-12">
					{threadIndex === 0 && (
						<div className="flex items-center gap-3">
							<div className="text-xl font-base">
								{message.subject ||
									(dict
											?.mailbox
											?.noSubjectTitle ??
										"No Subject")}
							</div>

							<MailUnsubscriber
								mailSubscription={
									mailSubscription
								}
								message={
									message
								}
							/>
						</div>
					)}
				</div>

				<div className="col-span-12 flex flex-col md:col-span-6">
					<div className="mt-4 flex items-center gap-1">
						<div className="text-sm font-semibold capitalize">
							{getMessageName(
									message,
									"from",
								) ??
								slugify(
									String(
										getMessageAddress(
											message,
											"from",
										),
									),
									{
										separator:
											" ",
									},
								)}
						</div>

						<div className="text-xs">
							{`<${
								getMessageAddress(
									message,
									"from",
								) ??
								getMessageName(
									message,
									"from",
								)
							}>`}
						</div>
					</div>

					<div className="flex items-center gap-1">
						<div className="text-xs">
							{dict?.mailbox
									?.toLower ??
								"to"}{" "}
							{`<${
								getMessageAddress(
									message,
									"to",
								) ??
								getMessageName(
									message,
									"to",
								)
							}>`}
						</div>
					</div>
				</div>

				<div className="col-span-12 my-1 flex items-center justify-between gap-2 md:col-span-6 md:justify-end">
					<div className="text-xs">
						{formatted}
					</div>

					<div className="flex items-center justify-end gap-1">
						<ThreadLabelHoverButtons
							mailboxThreadItem={{
								threadId,
								mailboxId:
								activeMailboxId,
							}}
							allLabels={
								allLabels
							}
							labelsByThreadId={
								labelsByThreadId
							}
						/>

						<ActionIcon
							variant="transparent"
							onClick={() =>
								openComposer(
									"reply",
								)
							}
						>
							<Reply size={18} />
						</ActionIcon>

						<div className="cursor-pointer">
							<Menu
								shadow="md"
								width={175}
								position="left-start"
							>
								<Menu.Target>
									<EllipsisVertical
										size={18}
									/>
								</Menu.Target>

								<Menu.Dropdown>
									<Menu.Item
										leftSection={
											<Reply
												size={
													14
												}
											/>
										}
										onClick={() =>
											openComposer(
												"reply",
											)
										}
									>
										{dict
												?.mailbox
												?.reply ??
											"Reply"}
									</Menu.Item>

									<Menu.Item
										leftSection={
											<Forward
												size={
													14
												}
											/>
										}
										onClick={() =>
											openComposer(
												"forward",
											)
										}
									>
										{dict
												?.mailbox
												?.forward ??
											"Forward"}
									</Menu.Item>

									<Menu.Divider />

									<Menu.Item
										leftSection={
											<Download
												size={
													14
												}
											/>
										}
										onClick={
											downloadEml
										}
									>
										{dict
												?.mailbox
												?.download ??
											"Download"}
									</Menu.Item>

									<Menu.Item
										leftSection={
											<Code
												size={
													14
												}
											/>
										}
										onClick={
											open
										}
									>
										{dict
												?.mailbox
												?.showOriginal ??
											"Show Original"}
									</Menu.Item>
								</Menu.Dropdown>
							</Menu>
						</div>
					</div>
				</div>
			</div>

			<InspectorBar
				children={children}
				message={message}
				onDownloadEml={downloadEml}
			/>

			{attachments?.length > 0 && (
				<div className="border-t border-dotted py-4">
					<div className="mb-4 font-semibold">
						{attachments.length}
						{dict?.mailbox
								?.attachmentsCountSuffix ??
							" attachments"}
					</div>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{attachments.map(
							(attachment) => (
								<EditorAttachmentItem
									key={
										attachment.id
									}
									attachment={
										attachment
									}
									publicConfig={
										publicConfig
									}
								/>
							),
						)}
					</div>
				</div>
			)}

			{threadIndex ===
				numberOfMessages - 1 &&
				!showEditor && (
					<div className="flex gap-6">
						<Button
							onClick={() =>
								openComposer(
									"reply",
								)
							}
							leftSection={
								<Reply />
							}
							variant="outline"
							radius="xl"
						>
							{dict?.mailbox
									?.reply ??
								"Reply"}
						</Button>

						<Button
							onClick={() =>
								openComposer(
									"forward",
								)
							}
							rightSection={
								<Forward />
							}
							variant="outline"
							radius="xl"
						>
							{dict?.mailbox
									?.forward ??
								"Forward"}
						</Button>
					</div>
				)}

			{showEditor && (
				<div
					ref={composerRef}
					className="mt-4 overflow-hidden rounded-lg border"
				>
					<MailComposer
						key={`${message.id}-${showEditorMode}`}
						publicConfig={
							publicConfig
						}
						identityMailboxes={
							identityMailboxes
						}
						activeIdentityPublicId={
							activeIdentityPublicId
						}
						message={message}
						initialMode={
							showEditorMode
						}
						onClose={() =>
							setShowEditor(
								false,
							)
						}
					/>
				</div>
			)}
		</>
	);
}

export default EmailRenderer;
