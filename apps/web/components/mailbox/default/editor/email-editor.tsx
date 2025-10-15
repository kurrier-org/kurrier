"use client";
import React, {
	useEffect,
	useRef,
	forwardRef,
	useImperativeHandle,
	useActionState,
} from "react";
import { MessageEntity } from "@db";
import {
	TextEditor,
	TextEditorHandle,
} from "@/components/mailbox/default/editor/rich-text-editor";
import Form from "next/form";
import { sendMail } from "@/lib/actions/mailbox";
import type { FormState, PublicConfig } from "@schema";
import { DynamicContextProvider } from "@/hooks/use-dynamic-context";
import { toast } from "sonner";

export type EmailEditorHandle = {
	focus: () => void;
	getElement: () => HTMLElement | null;
};

type Props = {
	onReady?: (el: HTMLElement) => void;
	message: MessageEntity | null;
	publicConfig: PublicConfig;
	showEditorMode: string;
	sentMailboxId: string;
	handleClose: () => void;
};

const EmailEditor = forwardRef<EmailEditorHandle, Props>(
	(
		{
			onReady,
			message,
			publicConfig,
			showEditorMode,
			sentMailboxId,
			handleClose,
		},
		ref,
	) => {
		const textEditorRef = useRef<TextEditorHandle>(null);

		useImperativeHandle(
			ref,
			() => ({
				focus: () => textEditorRef.current?.focus("end"),
				getElement: () => textEditorRef.current?.getElement() ?? null,
			}),
			[],
		);

		useEffect(() => {
			const el = textEditorRef.current?.getElement();
			if (el) onReady?.(el);
		}, [onReady]);

		const [formState, formAction, isPending] = useActionState<
			FormState,
			FormData
		>(sendMail, {});

		useEffect(() => {
			if (formState.error) {
				toast.error("Error", {
					description: formState.error,
				});
			} else if (formState.success) {
				handleClose();
				toast.success("Success", {
					description: formState.success,
				});
			}
		}, [formState]);

		return (
			<>
				<div className="mt-4" tabIndex={-1}>
					<DynamicContextProvider
						initialState={{ isPending, message, publicConfig, showEditorMode }}
					>
						<Form action={formAction}>
							<input
								type={"hidden"}
								name={"messageMailboxId"}
								value={message?.mailboxId}
							/>
							<input
								type={"hidden"}
								name={"sentMailboxId"}
								value={sentMailboxId}
							/>

							<input
								type={"hidden"}
								name={"mailboxId"}
								value={
									sentMailboxId
										? sentMailboxId
										: message?.mailboxId
											? message?.mailboxId
											: ""
								}
							/>
							<TextEditor name={"html"} ref={textEditorRef} />
						</Form>
					</DynamicContextProvider>
				</div>
			</>
		);
	},
);

EmailEditor.displayName = "EmailEditor";
export default EmailEditor;
