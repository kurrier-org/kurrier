"use client";

import type { PublicConfig } from "@schema";
import { MailPlus, Minus, PencilLine, X } from "lucide-react";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import EmailEditor, {
	type EmailEditorHandle,
} from "@/components/mailbox/default/editor/email-editor";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Button } from "@/components/ui/button";
import {
	type FetchIdentityMailboxListResult,
	fetchMailbox,
} from "@/lib/actions/mailbox";

function Portal({ children }: { children: React.ReactNode }) {
	const elRef = useRef<HTMLDivElement | null>(null);
	const [mounted, setMounted] = useState(false);

	if (!elRef.current) elRef.current = document.createElement("div");

	useEffect(() => {
		const el = elRef.current;
		if (!el) return;
		document.body.appendChild(el);
		setMounted(true);
		return () => {
			document.body.removeChild(el);
		};
	}, []);

	if (!mounted || !elRef.current) return null;

	return createPortal(children, elRef.current);
}

export default function ComposeMail({
	publicConfig,
	identityMailboxes,
	compact = false,
}: {
	publicConfig: PublicConfig;
	identityMailboxes: FetchIdentityMailboxListResult;
	compact?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [appeared, setAppeared] = useState(false);
	const [minimized, setMinimized] = useState(false);
	const [sentMailboxId, setSentMailboxId] = useState<string>();
	const showEditorMode = "compose";
	const editorRef = useRef<EmailEditorHandle>(null);
	const params = useParams();
	const dict = useOptionalDictionary();

	useEffect(() => {
		if (!open) return;
		fetchMailbox(String(params.identityPublicId), "sent").then(
			({ activeMailbox }) => setSentMailboxId(String(activeMailbox.id)),
		);

		const t = setTimeout(() => setAppeared(true), 16);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const onEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOpen(false);
				setAppeared(false);
			}
		};
		window.addEventListener("keydown", onEsc);

		return () => {
			clearTimeout(t);
			document.body.style.overflow = prev;
			window.removeEventListener("keydown", onEsc);
		};
	}, [open, params.identityPublicId]);

	const handleOpen = () => {
		setOpen(true);
		setMinimized(false);
	};

	const handleClose = () => {
		setOpen(false);
		setAppeared(false);
	};

	return (
		<>
			<Button
				size={compact ? "icon" : "lg"}
				className={compact ? "size-8" : "w-full"}
				onClick={handleOpen}
				disabled={!params.identityPublicId}
			>
				{compact ? <PencilLine /> : <MailPlus />}
				<span className={compact ? "sr-only" : ""}>
					{dict?.mailbox?.compose ?? "Compose"}
				</span>
			</Button>

			{!open ? null : (
				<Portal>
					<div
						className={[
							"fixed inset-0 z-[999] bg-black/20 sm:pointer-events-none sm:bg-transparent",
							appeared ? "opacity-100" : "opacity-0",
							"transition-opacity",
						].join(" ")}
					/>

					<div
						role="dialog"
						aria-modal="true"
						aria-label={dict?.mailbox?.newMessage ?? "New Message"}
						className={[
							"fixed inset-0 z-[1000] flex min-h-0 flex-col overflow-hidden bg-background text-foreground",
							"sm:inset-auto sm:right-4 sm:bottom-4 sm:max-h-[calc(100svh-2rem)] sm:w-[min(520px,calc(100vw-2rem))] sm:rounded-lg sm:border sm:shadow-xl",
							"motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
							appeared
								? "translate-y-0 scale-100 opacity-100"
								: "translate-y-3 scale-[0.98] opacity-0",
						].join(" ")}
					>
						<div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
							<div className="text-sm font-medium">
								{dict?.mailbox?.newMessage ?? "New Message"}
							</div>
							<div className="flex items-center gap-2">
								<div className="hidden sm:block">
									<IconBtn
										label={
											minimized
												? (dict?.mailbox?.restore ?? "Restore")
												: (dict?.mailbox?.minimize ?? "Minimize")
										}
										onClick={() => setMinimized((v) => !v)}
									>
										<Minus className="size-4" />
									</IconBtn>
								</div>
								<IconBtn
									label={dict?.mailbox?.close ?? "Close"}
									onClick={handleClose}
								>
									<X className="size-4" />
								</IconBtn>
							</div>
						</div>

						<div
							className={[
								"grid min-h-0 flex-1 px-0 pb-0",
								minimized
									? "grid-rows-[0fr] opacity-0"
									: "grid-rows-[1fr] opacity-100",
								"transition-[grid-template-rows,opacity] duration-200 ease-out",
								"overflow-hidden",
							].join(" ")}
						>
							<div className="min-h-0 overflow-auto pb-[env(safe-area-inset-bottom)]">
								<EmailEditor
									sentMailboxId={String(sentMailboxId)}
									ref={editorRef}
									publicConfig={publicConfig}
									identityMailboxes={identityMailboxes}
									message={null}
									onReady={() =>
										requestAnimationFrame(() => editorRef.current?.focus())
									}
									showEditorMode={showEditorMode}
									handleClose={handleClose}
								/>
							</div>
						</div>
					</div>
				</Portal>
			)}
		</>
	);
}

function IconBtn({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick?: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			title={label}
			className="p-2 rounded-md hover:bg-muted transition-colors"
		>
			{children}
		</button>
	);
}
