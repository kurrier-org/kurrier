// @ts-nocheck
import "@mantine/tiptap/styles.css";
import { RichTextEditor, Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

import React, {
	forwardRef,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

export type TextEditorHandle = {
	focus: (where?: "start" | "end") => void;
	getElement: () => HTMLElement | null;
	getHTML: () => string;
};

type TextEditorProps = {
	name?: string;
	defaultValue?: string;
	onChange?: (html: string) => void;
};

import { Temporal } from "@js-temporal/polyfill";
import EditorHeader from "@/components/mailbox/default/editor/editor-header";
import EditorFooter from "@/components/mailbox/default/editor/editor-footer";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { MessageEntity } from "@db";

function formatWhen(d: Date) {
	return Temporal.Instant.from(d.toISOString())
		.toZonedDateTimeISO(Temporal.Now.timeZoneId())
		.toLocaleString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
}

export const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
	({ name, defaultValue = "", onChange }, ref) => {
		const containerRef = useRef<HTMLDivElement>(null);
		const [value, setValue] = useState(defaultValue);
		const [textValue, setTextValue] = useState("");

		const editor = useEditor({
			immediatelyRender: false,
			parseOptions: { preserveWhitespace: "full" },
			extensions: [StarterKit, Link, Image],
			onUpdate: ({ editor }) => {
				setTextValue(editor.getText().trim());
				setValue(editor.getHTML().trim());
			},
		});

		useImperativeHandle(
			ref,
			() => ({
				focus: (where = "end") => {
					if (!editor) return;
					editor.commands.focus(where);
				},
				getElement: () => containerRef.current,
				getHTML: () => value,
			}),
			[editor, value],
		);

		const { state } = useDynamicContext<{
			isPending: boolean;
			message: MessageEntity;
			showEditorMode: "reply" | "forward" | "compose";
		}>();

		return (
			<div ref={containerRef} className="scroll-mt-[72px]">
				<RichTextEditor
					editor={editor}
					className={
						!state.message
							? "!border-0 -mt-4"
							: "!border !rounded-t-md !border-neutral-200"
					}
				>
					<EditorHeader />
					<RichTextEditor.Content className="prose min-h-52 text-sm p-2 leading-5" />
					<EditorFooter />
				</RichTextEditor>

				{/*<span className="text-xs text-neutral-500">*/}
				{/*	Press Shift + Enter for a line break*/}
				{/*</span>*/}
				{name ? (
					<>
						<input type="hidden" name={name} value={value} readOnly />
						<input type="hidden" name={`text`} value={textValue} readOnly />
					</>
				) : null}
			</div>
		);
	},
);

TextEditor.displayName = "TextEditor";
