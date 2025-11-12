// @ts-nocheck
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MessageAttachmentEntity, MessageEntity } from "@db";
import { getMessageAddress, getMessageName } from "@common/mail-client";
import slugify from "@sindresorhus/slugify";
import { Code, Download, EllipsisVertical, Forward, Reply } from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";
import dynamic from "next/dynamic";
import { ActionIcon, Button, Menu, Modal } from "@mantine/core";
import { EmailEditorHandle } from "@/components/mailbox/default/editor/email-editor";
import EditorAttachmentItem from "@/components/mailbox/default/editor/editor-attachment-item";
import { PublicConfig } from "@schema";
import { fetchMailbox, markAsRead } from "@/lib/actions/mailbox";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDisclosure } from "@mantine/hooks";
const EmailEditor = dynamic(
	() => import("@/components/mailbox/default/editor/email-editor"),
	{
		ssr: false,
		loading: () => (
			<div className="py-10 text-sm text-muted-foreground">Loading editor…</div>
		),
	},
);

function getScrollParent(el: HTMLElement): HTMLElement {
	let p: HTMLElement | null = el.parentElement;
	while (p) {
		const s = getComputedStyle(p);
		const overflowY = s.overflowY || s.overflow;
		const canScrollY =
			(overflowY === "auto" || overflowY === "scroll") &&
			p.scrollHeight > p.clientHeight;
		if (canScrollY) return p;
		p = p.parentElement;
	}
	return (document.scrollingElement || document.documentElement) as HTMLElement;
}

export function scrollToEditor(
	el: HTMLElement,
	{
		offsetTop = 96, // your sticky header + subject bar height
		minBottomGap = 48, // ensure some space below the editor
	} = {},
) {
	const container = getScrollParent(el);
	const isWindow = container === (document.scrollingElement as HTMLElement);

	const cRect = isWindow
		? ({ top: 10, height: window.innerHeight } as any)
		: container.getBoundingClientRect();
	const eRect = el.getBoundingClientRect();
	const currentTop = isWindow ? window.scrollY : container.scrollTop;

	// Place the editor top just below the sticky header
	const targetTop = currentTop + (eRect.top - cRect.top) - offsetTop;

	const doScroll = (top: number) => {
		if (isWindow) window.scrollTo({ top, behavior: "smooth" });
		else container.scrollTo({ top, behavior: "smooth" });
	};

	doScroll(targetTop);

	// After layout settles (images/fonts), verify bottom gap once
	setTimeout(() => {
		const e2 = el.getBoundingClientRect();
		const viewH = isWindow
			? window.innerHeight
			: (container as HTMLElement).clientHeight;
		const bottomGap = viewH - e2.bottom;
		if (bottomGap < minBottomGap) {
			const delta = minBottomGap - bottomGap;
			if (isWindow) window.scrollBy({ top: delta, behavior: "smooth" });
			else
				(container as HTMLElement).scrollBy({ top: delta, behavior: "smooth" });
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
	children,
}: {
	threadIndex: number;
	numberOfMessages: number;
	message: MessageEntity;
	attachments: MessageAttachmentEntity[];
	publicConfig: PublicConfig;
	threadId: string;
	markSmtp: boolean;
	activeMailboxId: string;
	children?: React.ReactNode;
}) {
	const formatted = Temporal.Instant.from(message.createdAt.toISOString())
		.toZonedDateTimeISO(Temporal.Now.timeZoneId())
		.toLocaleString("en-US", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});

	const [showEditor, setShowEditor] = useState<boolean>(false);
	const [showEditorMode, setShowEditorMode] = useState<string>("reply");
	const editorRef = useRef<EmailEditorHandle>(null);
	const seenRef = useRef(null);

	const [sentMailboxId, setSentMailboxId] = useState<string | undefined>(
		undefined,
	);
	const params = useParams();
	const fetchSentMailbox = async () => {
		const { activeMailbox } = await fetchMailbox(
			String(params.identityPublicId),
			"sent",
		);
		setSentMailboxId(String(activeMailbox.id));
	};

	useEffect(() => {
		if (!sentMailboxId && !seenRef.current) {
			seenRef.current = true;
			fetchSentMailbox();
		}
	}, []);

	useEffect(() => {
		if (activeMailboxId) {
			markAsRead(threadId, activeMailboxId, markSmtp, true);
		}
	}, [activeMailboxId]);

	const downloadEml = async () => {
		const supabase = createClient(publicConfig);
		const { data } = await supabase.storage
			.from("attachments")
			.createSignedUrl(String(message.rawStorageKey), 3600, {
				download: true,
			});
		if (data?.signedUrl) {
			window.open(data.signedUrl, "_blank");
		}
	};

	const [opened, { open, close }] = useDisclosure(false);
	const [emailString, setEmailString] = useState<string | null>(null);

	useEffect(() => {
		if (opened) {
			const supabase = createClient(publicConfig);
			supabase.storage
				.from("attachments")
				.download(String(message.rawStorageKey))
				.then(({ data, error }) => {
					if (error) {
						console.error("Error downloading original message:", error);
						return;
					}
					if (data) {
						data.text().then((raw) => {
							setEmailString(raw.slice(0, 10000));
						});
					}
				});
		}
	}, [opened]);

	const formattedTime = useMemo(() => {
		return Temporal.Instant.from(message.createdAt.toISOString())
			.toZonedDateTimeISO(Temporal.Now.timeZoneId())
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

	return (
		<>
			<Modal opened={opened} onClose={close} title="Original message" size="xl">
				<div className="text-sm border rounded-md overflow-hidden">
					{/* Header Rows */}
					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							Message ID
						</div>
						<div className="px-3 py-2 text-green-700 break-all">
							{message.messageId}
						</div>
					</div>

					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							Created on
						</div>
						<div className="px-3 py-2">{formattedTime}</div>
					</div>

					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							From
						</div>
						<div className="px-3 py-2">
							{String(message?.headersJson?.from?.text)}
						</div>
					</div>

					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							To
						</div>
						{/*<div className="px-3 py-2">suisse@dinebot.io</div>*/}
						<div className="px-3 py-2">
							{String(message?.headersJson?.to?.text)}
						</div>
					</div>

					<div className="grid grid-cols-[160px_1fr] border-b">
						<div className="bg-muted px-3 py-2 font-medium text-muted-foreground">
							Subject
						</div>
						<div className="px-3 py-2">
							{/*Google Workspace: Your invoice is available for dinebot.io*/}
							{message?.headersJson?.subject}
						</div>
					</div>

					{/*<div className="grid grid-cols-[160px_1fr] border-b">*/}
					{/*    <div className="bg-muted px-3 py-2 font-medium text-muted-foreground">*/}
					{/*        SPF*/}
					{/*    </div>*/}
					{/*    <div className="px-3 py-2">*/}
					{/*        <span className="text-green-600 font-semibold">PASS</span> with IP 209.85.220.69{" "}*/}
					{/*        <a href="#" className="text-blue-600 hover:underline">Learn more</a>*/}
					{/*    </div>*/}
					{/*</div>*/}

					{/*<div className="grid grid-cols-[160px_1fr] border-b">*/}
					{/*    <div className="bg-muted px-3 py-2 font-medium text-muted-foreground">*/}
					{/*        DKIM*/}
					{/*    </div>*/}
					{/*    <div className="px-3 py-2">*/}
					{/*        <span className="text-green-600 font-semibold">'PASS'</span> with domain google.com{" "}*/}
					{/*        <a href="#" className="text-blue-600 hover:underline">Learn more</a>*/}
					{/*    </div>*/}
					{/*</div>*/}

					{/*<div className="grid grid-cols-[160px_1fr]">*/}
					{/*    <div className="bg-muted px-3 py-2 font-medium text-muted-foreground">*/}
					{/*        DMARC*/}
					{/*    </div>*/}
					{/*    <div className="px-3 py-2">*/}
					{/*        <span className="text-green-600 font-semibold">'PASS'</span>{" "}*/}
					{/*        <a href="#" className="text-blue-600 hover:underline">Learn more</a>*/}
					{/*    </div>*/}
					{/*</div>*/}
				</div>

				{/* Action Buttons */}
				{/*<div className="flex justify-end gap-2 mt-4">*/}
				{/*<button*/}
				{/*    className="text-blue-600 hover:underline text-sm"*/}
				{/*    onClick={() => console.log("download original")}*/}
				{/*>*/}
				{/*    Download original*/}
				{/*</button>*/}
				{/*<button*/}
				{/*    className="text-blue-600 hover:underline text-sm"*/}
				{/*    onClick={() => navigator.clipboard.writeText("original message headers")}*/}
				{/*>*/}
				{/*    Copy to clipboard*/}
				{/*</button>*/}
				{/*</div>*/}

				<div
					className="
    bg-neutral-50 dark:bg-neutral-900
    border border-neutral-200 dark:border-neutral-800
    rounded-md mt-4 p-4 text-sm font-mono
    whitespace-pre-wrap break-words overflow-x-auto
    shadow-sm text-neutral-800 dark:text-neutral-200
  "
				>
					{emailString || "Loading raw message..."}
				</div>
			</Modal>

			<div className={"grid grid-cols-12"}>
				<div className={"col-span-12"}>
					{threadIndex === 0 && (
						<h1 className="text-xl font-base">
							{message.subject || "No Subject"}
						</h1>
					)}
				</div>

				<div className={"md:col-span-6 col-span-12 flex flex-col"}>
					<div className={"mt-4 flex gap-1 items-center"}>
						<div className={"text-sm font-semibold capitalize"}>
							{getMessageName(message, "from") ??
								slugify(String(getMessageAddress(message, "from")), {
									separator: " ",
								})}
						</div>
						<div
							className={"text-xs"}
						>{`<${getMessageAddress(message, "from") ?? getMessageName(message, "from")}>`}</div>
					</div>
					<div className={"flex gap-1 items-center"}>
						<div className={"text-xs"}>
							to{" "}
							{`<${getMessageAddress(message, "to") ?? getMessageName(message, "to")}>`}
						</div>
					</div>
				</div>

				{/*<div className={"col-span-6 my-1"}>*/}
				{/*    <div className={"text-xs"}>{formatted}</div>*/}
				{/*</div>*/}

				<div
					className={
						"md:col-span-6 col-span-12 my-1 flex md:justify-end justify-between items-center gap-2 "
					}
				>
					<div className={"text-xs "}>{formatted}</div>
					<div className={"flex gap-1 justify-end items-center"}>
						<ActionIcon
							variant={"transparent"}
							onClick={() => {
								setShowEditor(!showEditor);
							}}
						>
							<Reply size={18} />
						</ActionIcon>

						<div className={"cursor-pointer"}>
							<Menu shadow="md" width={175} position={"left-start"}>
								<Menu.Target>
									<EllipsisVertical size={18} />
								</Menu.Target>

								<Menu.Dropdown>
									<Menu.Item
										leftSection={<Reply size={14} />}
										onClick={() => {
											setShowEditorMode("reply");
											setShowEditor(true);
										}}
									>
										Reply
									</Menu.Item>
									<Menu.Item
										leftSection={<Forward size={14} />}
										onClick={() => {
											setShowEditorMode("forward");
											setShowEditor(true);
										}}
									>
										Forward
									</Menu.Item>
									<Menu.Divider />

									<Menu.Item
										leftSection={<Download size={14} />}
										onClick={downloadEml}
									>
										Download
									</Menu.Item>
									<Menu.Item leftSection={<Code size={14} />} onClick={open}>
										Show Original
									</Menu.Item>
								</Menu.Dropdown>
							</Menu>
						</div>
					</div>
				</div>
			</div>

			{/*<hr className={"my-12"}/>*/}

			{/*<div className="flex flex-col">*/}
			{/*    {threadIndex === 0 && (*/}
			{/*        <h1 className="text-xl font-base">*/}
			{/*            {message.subject || "No Subject"}*/}
			{/*        </h1>*/}
			{/*    )}*/}

			{/*    <div className={"flex justify-between"}>*/}
			{/*        <div>*/}
			{/*            <div className={"mt-4 flex gap-1 items-center"}>*/}
			{/*                <div className={"text-sm font-semibold capitalize"}>*/}
			{/*                    {getMessageName(message, "from") ??*/}
			{/*                        slugify(String(getMessageAddress(message, "from")), {*/}
			{/*                            separator: " ",*/}
			{/*                        })}*/}
			{/*                </div>*/}
			{/*                <div*/}
			{/*                    className={"text-xs"}*/}
			{/*                >{`<${getMessageAddress(message, "from") ?? getMessageName(message, "from")}>`}</div>*/}
			{/*            </div>*/}
			{/*            <div className={"flex gap-1 items-center"}>*/}
			{/*                <div className={"text-xs"}>*/}
			{/*                    to{" "}*/}
			{/*                    {`<${getMessageAddress(message, "to") ?? getMessageName(message, "to")}>`}*/}
			{/*                </div>*/}
			{/*            </div>*/}
			{/*        </div>*/}

			{/*        <div className={"flex gap-4 items-center"}>*/}
			{/*            <div className={"text-xs"}>{formatted}</div>*/}

			{/*            <ActionIcon*/}
			{/*                variant={"transparent"}*/}
			{/*                onClick={() => {*/}
			{/*                    setShowEditor(!showEditor);*/}
			{/*                }}*/}
			{/*            >*/}
			{/*                <Reply size={18} />*/}
			{/*            </ActionIcon>*/}

			{/*            <div className={"cursor-pointer"}>*/}
			{/*                <Menu shadow="md" width={175} position={"left-start"}>*/}
			{/*                    <Menu.Target>*/}
			{/*                        <EllipsisVertical size={18} />*/}
			{/*                    </Menu.Target>*/}

			{/*                    <Menu.Dropdown>*/}
			{/*                        <Menu.Item*/}
			{/*                            leftSection={<Reply size={14} />}*/}
			{/*                            onClick={() => {*/}
			{/*                                setShowEditorMode("reply");*/}
			{/*                                setShowEditor(true);*/}
			{/*                            }}*/}
			{/*                        >*/}
			{/*                            Reply*/}
			{/*                        </Menu.Item>*/}
			{/*                        <Menu.Item*/}
			{/*                            leftSection={<Forward size={14} />}*/}
			{/*                            onClick={() => {*/}
			{/*                                setShowEditorMode("forward");*/}
			{/*                                setShowEditor(true);*/}
			{/*                            }}*/}
			{/*                        >*/}
			{/*                            Forward*/}
			{/*                        </Menu.Item>*/}
			{/*                        <Menu.Divider />*/}

			{/*                        <Menu.Item*/}
			{/*                            leftSection={<Download size={14} />}*/}
			{/*                            onClick={downloadEml}*/}
			{/*                        >*/}
			{/*                            Download*/}
			{/*                        </Menu.Item>*/}
			{/*                        <Menu.Item leftSection={<Code size={14} />} onClick={open}>*/}
			{/*                            Show Original*/}
			{/*                        </Menu.Item>*/}
			{/*                    </Menu.Dropdown>*/}
			{/*                </Menu>*/}
			{/*            </div>*/}
			{/*        </div>*/}
			{/*    </div>*/}
			{/*</div>*/}

			{children}

			{attachments?.length > 0 && (
				<div className={"border-t border-dotted"}>
					<div className={"font-semibold my-4"}>
						{attachments?.length} attachments
					</div>
					<div className={"flex flex-col"}>
						{attachments?.map((attachment) => {
							return (
								<EditorAttachmentItem
									key={attachment.id}
									attachment={attachment}
									publicConfig={publicConfig}
								/>
							);
						})}
					</div>
				</div>
			)}

			{threadIndex === numberOfMessages - 1 && !showEditor && (
				<div className={"flex gap-6"}>
					<Button
						onClick={() => {
							setShowEditor(!showEditor);
							setShowEditorMode("reply");
						}}
						leftSection={<Reply />}
						variant={"outline"}
						radius={"xl"}
					>
						Reply
					</Button>
					<Button
						onClick={() => {
							setShowEditor(!showEditor);
							setShowEditorMode("forward");
						}}
						rightSection={<Forward />}
						variant={"outline"}
						radius={"xl"}
					>
						Forward
					</Button>
				</div>
			)}

			{showEditor && (
				<div>
					<EmailEditor
						sentMailboxId={String(sentMailboxId)}
						ref={editorRef}
						publicConfig={publicConfig}
						message={message}
						onReady={(el) => {
							scrollToEditor(el, { offsetTop: 96, minBottomGap: 64 });
							requestAnimationFrame(() => editorRef.current?.focus());
						}}
						handleClose={() => setShowEditor(false)}
						showEditorMode={showEditorMode}
					/>
				</div>
			)}
		</>
	);
}

export default EmailRenderer;
