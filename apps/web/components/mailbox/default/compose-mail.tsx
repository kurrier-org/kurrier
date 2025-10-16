"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, X, MailPlus, PencilLine } from "lucide-react";
import EmailEditor, {
	EmailEditorHandle,
} from "@/components/mailbox/default/editor/email-editor";
import { PublicConfig } from "@schema";
import { Button } from "@/components/ui/button";
import { fetchMailbox } from "@/lib/actions/mailbox";
import { useParams } from "next/navigation";
import { useMediaQuery } from "@mantine/hooks";
import { ActionIcon } from "@mantine/core";

function Portal({ children }: { children: React.ReactNode }) {
	const elRef = useRef<HTMLDivElement | null>(null);
	const [mounted, setMounted] = useState(false);

	if (!elRef.current) elRef.current = document.createElement("div");

	useEffect(() => {
		const el = elRef.current!;
		document.body.appendChild(el);
		setMounted(true);
		return () => {
			document.body.removeChild(el);
		};
	}, []);

	return mounted ? createPortal(children, elRef.current!) : null;
}

export default function ComposeMail({
	publicConfig,
}: {
	publicConfig: PublicConfig;
}) {
	const [open, setOpen] = useState(false);
	const [appeared, setAppeared] = useState(false);
	const [minimized, setMinimized] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const [sentMailboxId, setSentMailboxId] = useState<string>();
	const [showEditorMode, setShowEditorMode] = useState<string>("compose");
	const editorRef = useRef<EmailEditorHandle>(null);
	const params = useParams();
	const isMobile = useMediaQuery("(max-width: 768px)");

	const fetchSentMailbox = async () => {
		const { activeMailbox } = await fetchMailbox(
			String(params.identityPublicId),
			"sent",
		);
		setSentMailboxId(String(activeMailbox.id));
	};

	useEffect(() => {
		if (!open) return;
		fetchSentMailbox();

		const t = setTimeout(() => setAppeared(true), 16);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		const onEsc = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
		window.addEventListener("keydown", onEsc);

		return () => {
			clearTimeout(t);
			document.body.style.overflow = prev;
			window.removeEventListener("keydown", onEsc);
		};
	}, [open]);

	const handleOpen = () => {
		setOpen(true);
		setMinimized(false);
		setExpanded(false);
	};

	const handleClose = () => {
		setOpen(false);
		setAppeared(false);
	};

	return (
		<>
			{isMobile ? (
				<ActionIcon onClick={handleOpen}>
					<PencilLine size={16} />
				</ActionIcon>
			) : (
				<Button size="lg" onClick={handleOpen}>
					<MailPlus className="h-5 w-5" />
					Compose
				</Button>
			)}

			{!open ? null : (
				<Portal>
					{/* Backdrop */}
					<div
						className={[
							"fixed inset-0",
							appeared ? "opacity-100" : "opacity-0",
							"transition-opacity",
						].join(" ")}
					/>

					{isMobile ? (
						/* ========= Mobile: full-screen sheet with just header + body ========= */
						<div
							role="dialog"
							aria-modal="true"
							className={[
								"fixed inset-0 z-[1000] bg-background text-foreground",
								"flex flex-col",
								"motion-safe:transition-transform motion-safe:duration-200",
								appeared ? "translate-y-0" : "translate-y-3",
							].join(" ")}
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3">
								<div className="text-sm font-medium">New Message</div>
								<button
									type="button"
									onClick={handleClose}
									aria-label="Close"
									title="Close"
									className="p-2 rounded-md hover:bg-muted transition-colors"
								>
									<X className="h-5 w-5" />
								</button>
							</div>

							{/* Body (scrolls) */}
							<div className="flex-1 min-h-0 overflow-auto px-0 pb-[env(safe-area-inset-bottom)]">
								<EmailEditor
									sentMailboxId={String(sentMailboxId)}
									ref={editorRef}
									publicConfig={publicConfig}
									message={null}
									onReady={() =>
										requestAnimationFrame(() => editorRef.current?.focus())
									}
									showEditorMode={showEditorMode}
									handleClose={handleClose}
								/>
							</div>
						</div>
					) : (
						/* ========= Desktop: keep your current floating window ========= */
						<div
							role="dialog"
							aria-modal="true"
							className={[
								"fixed z-[1000] bg-background border shadow-xl rounded-2xl overflow-hidden",
								"right-4 bottom-4",
								expanded ? "w-[720px] h-[70vh]" : "w-[520px] h-auto",
								"transition-[width,height] duration-200 ease-out",
								"motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-safe:transition-transform",
								appeared
									? "opacity-100 translate-y-0 scale-100"
									: "opacity-0 translate-y-3 scale-[0.98]",
								"hover:shadow-2xl",
							].join(" ")}
							onClick={(e) => e.stopPropagation()}
						>
							{/* Header */}
							<div className="flex items-center justify-between border-b px-4 py-2">
								<div className="text-sm font-medium">New Message</div>
								<div className="flex items-center gap-2">
									<IconBtn
										label={minimized ? "Restore" : "Minimize"}
										onClick={() => setMinimized((v) => !v)}
									>
										<Minus className="h-4 w-4" />
									</IconBtn>
									<IconBtn label="Close" onClick={handleClose}>
										<X className="h-4 w-4" />
									</IconBtn>
								</div>
							</div>

							{/* Body */}
							<div
								className={[
									"px-0 pb-0 grid",
									minimized
										? "grid-rows-[0fr] opacity-0"
										: "grid-rows-[1fr] opacity-100",
									"transition-[grid-template-rows,opacity] duration-200 ease-out",
									"overflow-hidden",
									expanded ? "max-h-[calc(70vh-48px)]" : "max-h-none",
								].join(" ")}
							>
								<div className="min-h-0">
									<EmailEditor
										sentMailboxId={String(sentMailboxId)}
										ref={editorRef}
										publicConfig={publicConfig}
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
					)}
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

// "use client";
//
// import React, { useEffect, useRef, useState } from "react";
// import { createPortal } from "react-dom";
// import {Minus, X, MailPlus, PencilLine} from "lucide-react";
// import EmailEditor, {
// 	EmailEditorHandle,
// } from "@/components/mailbox/default/editor/email-editor";
// import { PublicConfig } from "@schema";
// import { Button } from "@/components/ui/button";
// import { fetchMailbox } from "@/lib/actions/mailbox";
// import { useParams } from "next/navigation";
// import {useMediaQuery} from "@mantine/hooks";
// import {ActionIcon} from "@mantine/core";
//
// function Portal({ children }: { children: React.ReactNode }) {
// 	const elRef = useRef<HTMLDivElement | null>(null);
// 	const [mounted, setMounted] = useState(false);
//
// 	if (!elRef.current) elRef.current = document.createElement("div");
//
// 	useEffect(() => {
// 		const el = elRef.current!;
// 		document.body.appendChild(el);
// 		setMounted(true);
// 		return () => {
// 			document.body.removeChild(el);
// 		};
// 	}, []);
//
// 	return mounted ? createPortal(children, elRef.current!) : null;
// }
//
// export default function ComposeMail({
// 	publicConfig,
// }: {
// 	publicConfig: PublicConfig;
// }) {
// 	const [open, setOpen] = useState(false);
// 	const [appeared, setAppeared] = useState(false);
// 	const [minimized, setMinimized] = useState(false);
// 	const [expanded, setExpanded] = useState(false);
// 	const [sentMailboxId, setSentMailboxId] = useState<string>();
// 	const [showEditorMode, setShowEditorMode] = useState<string>("compose");
// 	const editorRef = useRef<EmailEditorHandle>(null);
// 	const params = useParams();
//
// 	const fetchSentMailbox = async () => {
// 		const { activeMailbox } = await fetchMailbox(
// 			String(params.identityPublicId),
// 			"sent",
// 		);
// 		setSentMailboxId(String(activeMailbox.id));
// 	};
//
// 	useEffect(() => {
// 		if (!open) return;
// 		fetchSentMailbox();
//
// 		const t = setTimeout(() => setAppeared(true), 16);
// 		const prev = document.body.style.overflow;
// 		document.body.style.overflow = "hidden";
//
// 		const onEsc = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
// 		window.addEventListener("keydown", onEsc);
//
// 		return () => {
// 			clearTimeout(t);
// 			document.body.style.overflow = prev;
// 			window.removeEventListener("keydown", onEsc);
// 		};
// 	}, [open]);
//
// 	const handleOpen = () => {
// 		setOpen(true);
// 		setMinimized(false);
// 		setExpanded(false);
// 	};
//
// 	const handleClose = () => {
// 		setOpen(false);
// 		setAppeared(false);
// 	};
//
//     const isMobile = useMediaQuery("(max-width: 768px)");
//
// 	return (
// 		<>
//         {isMobile ? <ActionIcon onClick={handleOpen}>
//             <PencilLine size={16} />
//         </ActionIcon> : <Button size="lg" onClick={handleOpen}>
// 				<MailPlus className="h-5 w-5" />
// 				Compose
// 			</Button>}
//
// 			{open && (
// 				<Portal>
// 					{/* Backdrop (click to close) */}
// 					<div
// 						className={[
// 							"fixed inset-0 ",
// 							appeared ? "opacity-100" : "opacity-0",
// 							"transition-opacity",
// 						].join(" ")}
// 					/>
//
// 					{/* Composer */}
// 					<div
// 						role="dialog"
// 						aria-modal="true"
// 						className={[
// 							"fixed z-[1000] bg-background border shadow-xl rounded-2xl overflow-hidden",
// 							"right-4 bottom-4",
// 							expanded ? "w-[720px] h-[70vh]" : "w-[520px] h-auto",
// 							"transition-[width,height] duration-200 ease-out",
// 							"motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-safe:transition-transform",
// 							appeared
// 								? "opacity-100 translate-y-0 scale-100"
// 								: "opacity-0 translate-y-3 scale-[0.98]",
// 							"hover:shadow-2xl",
// 						].join(" ")}
// 						onClick={(e) => e.stopPropagation()} // prevent backdrop close
// 					>
// 						{/* Header */}
// 						<div className="flex items-center justify-between border-b px-4 py-2">
// 							<div className="text-sm font-medium">New Message</div>
// 							<div className="flex items-center gap-2">
// 								<IconBtn
// 									label={minimized ? "Restore" : "Minimize"}
// 									onClick={() => setMinimized((v) => !v)}
// 								>
// 									<Minus className="h-4 w-4" />
// 								</IconBtn>
// 								<IconBtn label="Close" onClick={handleClose}>
// 									<X className="h-4 w-4" />
// 								</IconBtn>
// 							</div>
// 						</div>
//
// 						{/* Body */}
// 						<div
// 							className={[
// 								"px-0 pb-0 grid",
// 								minimized
// 									? "grid-rows-[0fr] opacity-0"
// 									: "grid-rows-[1fr] opacity-100",
// 								"transition-[grid-template-rows,opacity] duration-200 ease-out",
// 								"overflow-hidden",
// 								expanded ? "max-h-[calc(70vh-48px)]" : "max-h-none",
// 							].join(" ")}
// 						>
// 							<div className="min-h-0">
// 								<EmailEditor
// 									sentMailboxId={String(sentMailboxId)}
// 									ref={editorRef}
// 									publicConfig={publicConfig}
// 									message={null}
// 									onReady={() =>
// 										requestAnimationFrame(() => editorRef.current?.focus())
// 									}
// 									showEditorMode={showEditorMode}
// 									handleClose={handleClose}
// 								/>
// 							</div>
// 						</div>
// 					</div>
// 				</Portal>
// 			)}
// 		</>
// 	);
// }
//
// function IconBtn({
// 	label,
// 	onClick,
// 	children,
// }: {
// 	label: string;
// 	onClick?: () => void;
// 	children: React.ReactNode;
// }) {
// 	return (
// 		<button
// 			type="button"
// 			onClick={onClick}
// 			aria-label={label}
// 			title={label}
// 			className="p-2 rounded-md hover:bg-muted transition-colors"
// 		>
// 			{children}
// 		</button>
// 	);
// }
