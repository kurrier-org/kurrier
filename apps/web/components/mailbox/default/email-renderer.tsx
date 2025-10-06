"use client";
import React, { useRef, useState } from "react";
import { MessageAttachmentEntity, MessageEntity } from "@db";
import {
    getMessageAddress,
    getMessageName,
} from "@common/mail-client";
import slugify from "@sindresorhus/slugify";
import {EllipsisVertical, Forward, Reply, Star} from "lucide-react";
import { Temporal } from "@js-temporal/polyfill";
import dynamic from "next/dynamic";
import {ActionIcon, Button} from "@mantine/core";
import { EmailEditorHandle } from "@/components/mailbox/default/editor/email-editor";
import EditorAttachmentItem from "@/components/mailbox/default/editor/editor-attachment-item";
import { PublicConfig } from "@schema";
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

function scrollToEditor(
    el: HTMLElement,
    {
        offsetTop = 96,   // your sticky header + subject bar height
        minBottomGap = 48 // ensure some space below the editor
    } = {}
) {
    const container = getScrollParent(el);
    const isWindow = container === (document.scrollingElement as HTMLElement);

    const cRect = isWindow ? { top: 10, height: window.innerHeight } as any
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
        const viewH = isWindow ? window.innerHeight : (container as HTMLElement).clientHeight;
        const bottomGap = viewH - e2.bottom;
        if (bottomGap < minBottomGap) {
            const delta = minBottomGap - bottomGap;
            if (isWindow) window.scrollBy({ top: delta, behavior: "smooth" });
            else (container as HTMLElement).scrollBy({ top: delta, behavior: "smooth" });
        }
    }, 120);
}

function EmailRenderer({
    threadIndex,
    numberOfMessages,
	message,
	attachments,
	publicConfig,
	children,
}: {
    threadIndex: number
    numberOfMessages: number
	message: MessageEntity;
	attachments: MessageAttachmentEntity[];
	publicConfig: PublicConfig;
	children?: React.ReactNode;
}) {
	const formatted = Temporal.Instant.from(message.createdAt.toISOString())
		.toZonedDateTimeISO(Temporal.Now.timeZoneId())
		.toLocaleString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

	const [showEditor, setShowEditor] = useState<boolean>(false);
	const [showEditorMode, setShowEditorMode] = useState<string>("reply");
	const editorRef = useRef<EmailEditorHandle>(null);

	return (
		<>
			<div className="flex flex-col">
                {threadIndex === 0 && <h1 className="text-xl font-base">{message.subject || "No Subject"}</h1>}

				<div className={"flex justify-between"}>
					<div>
						<div className={"mt-4 flex gap-1 items-center"}>
							<div className={"text-sm font-semibold capitalize"}>
								{getMessageName(message, "from") ??
									slugify(String(getMessageAddress(message, "from")), { separator: " " })}
							</div>
							<div
								className={"text-xs"}
							>{`<${getMessageAddress(message, "from") ?? getMessageName(message, "from")}>`}</div>
						</div>
						<div className={"flex gap-1 items-center"}>
							<div className={"text-xs"}>to {`<${getMessageAddress(message, "to") ?? getMessageName(message, "to")}>`}</div>
						</div>
					</div>

					<div className={"flex gap-4 items-center"}>
						<div className={"text-xs"}>{formatted}</div>
						<Star size={12} />

						<ActionIcon
							variant={"transparent"}
							onClick={() => {
								setShowEditor(!showEditor);
							}}
						>
							<Reply size={18} />
						</ActionIcon>
						<EllipsisVertical size={18} />
					</div>
				</div>
			</div>

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

            {threadIndex === (numberOfMessages-1) && !showEditor && <div className={"flex gap-6"}>
                <Button onClick={() => {
                    setShowEditor(!showEditor);
                    setShowEditorMode("reply");
                }} leftSection={<Reply />} variant={"outline"} radius={"xl"}>Reply</Button>
                <Button onClick={() => {
                    setShowEditor(!showEditor);
                    setShowEditorMode("forward");
                }} rightSection={<Forward />} variant={"outline"} radius={"xl"}>Forward</Button>
            </div>}

			{showEditor && (
				<div>
					<EmailEditor
						ref={editorRef}
						publicConfig={publicConfig}
						message={message}
						onReady={(el) => {
                            scrollToEditor(el, { offsetTop: 96, minBottomGap: 64 });
							requestAnimationFrame(() => editorRef.current?.focus());
						}}
                        showEditorMode={showEditorMode}
					/>
				</div>
			)}
		</>
	);
}

export default EmailRenderer;
