"use client";

import {
    useEffect,
    useRef,
    type MouseEvent,
    type ReactNode,
} from "react";
import {
    EditorContent,
    useEditor,
    useEditorState,
    type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import type {
    HeadingBlock,
    TextBlock,
} from "../types";

type RichTextBlockEditorProps = {
    block: TextBlock | HeadingBlock;
    selected: boolean;
    onSelect: () => void;
    onChange: (content: string) => void;
    onEditorReady: (editor: Editor) => void;
};

type ToolbarButtonProps = {
    children: ReactNode;
    title: string;
    active?: boolean;
    onClick: () => void;
};

function ToolbarButton({
                           children,
                           title,
                           active = false,
                           onClick,
                       }: ToolbarButtonProps) {
    const preserveSelection = (
        event: MouseEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
    };

    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            aria-pressed={active}
            className={[
                "min-w-8 rounded-md border px-2 py-1 text-xs",
                active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
            ].join(" ")}
            onMouseDown={preserveSelection}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

export function RichTextToolbar({
                                    editor,
                                    showLists,
                                }: {
    editor: Editor | null;
    showLists: boolean;
}) {
    const state = useEditorState({
        editor,
        selector: ({ editor: currentEditor }) => ({
            bold: currentEditor?.isActive("bold") ?? false,
            italic: currentEditor?.isActive("italic") ?? false,
            underline:
                currentEditor?.isActive("underline") ?? false,
            bulletList:
                currentEditor?.isActive("bulletList") ?? false,
            orderedList:
                currentEditor?.isActive("orderedList") ?? false,
            link: currentEditor?.isActive("link") ?? false,
        }),
    });

    if (!editor) {
        return null;
    }

    const editLink = () => {
        const currentHref =
            editor.getAttributes("link").href ?? "";

        const href = window.prompt(
            "Enter the link URL",
            currentHref,
        );

        if (href === null) {
            return;
        }

        const normalizedHref = href.trim();

        if (!normalizedHref) {
            editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .unsetLink()
                .run();

            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: normalizedHref })
            .run();
    };

    return (
        <div className="flex flex-wrap items-center gap-1">
            <ToolbarButton
                title="Bold"
                active={state?.bold}
                onClick={() =>
                    editor.chain().focus().toggleBold().run()
                }
            >
                <strong>B</strong>
            </ToolbarButton>

            <ToolbarButton
                title="Italic"
                active={state?.italic}
                onClick={() =>
                    editor.chain().focus().toggleItalic().run()
                }
            >
                <em>I</em>
            </ToolbarButton>

            <ToolbarButton
                title="Underline"
                active={state?.underline}
                onClick={() =>
                    editor
                        .chain()
                        .focus()
                        .toggleUnderline()
                        .run()
                }
            >
                <span className="underline">U</span>
            </ToolbarButton>

            {showLists && (
                <>
                    <div className="mx-1 h-5 border-l" />

                    <ToolbarButton
                        title="Bullet list"
                        active={state?.bulletList}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleBulletList()
                                .run()
                        }
                    >
                        • List
                    </ToolbarButton>

                    <ToolbarButton
                        title="Numbered list"
                        active={state?.orderedList}
                        onClick={() =>
                            editor
                                .chain()
                                .focus()
                                .toggleOrderedList()
                                .run()
                        }
                    >
                        1. List
                    </ToolbarButton>
                </>
            )}

            <div className="mx-1 h-5 border-l" />

            <ToolbarButton
                title="Edit link"
                active={state?.link}
                onClick={editLink}
            >
                Link
            </ToolbarButton>

            <ToolbarButton
                title="Remove formatting"
                onClick={() =>
                    editor
                        .chain()
                        .focus()
                        .unsetAllMarks()
                        .clearNodes()
                        .run()
                }
            >
                Clear
            </ToolbarButton>
        </div>
    );
}

export function RichTextBlockEditor({
                                        block,
                                        selected,
                                        onSelect,
                                        onChange,
                                        onEditorReady,
                                    }: RichTextBlockEditorProps) {
    const onChangeRef = useRef(onChange);
    const onSelectRef = useRef(onSelect);
    const onEditorReadyRef = useRef(onEditorReady);

    useEffect(() => {
        onChangeRef.current = onChange;
        onSelectRef.current = onSelect;
        onEditorReadyRef.current = onEditorReady;
    }, [onChange, onSelect, onEditorReady]);

    const editor = useEditor(
        {
            immediatelyRender: false,

            extensions: [
                StarterKit.configure({
                    undoRedo: false,
                    heading: false,
                    blockquote: false,
                    codeBlock: false,
                    horizontalRule: false,
                    link: {
                        openOnClick: false,
                        autolink: true,
                        defaultProtocol: "https",
                    },
                }),
            ],

            content: block.content,

            editorProps: {
                attributes: {
                    class: [
                        "min-h-6 cursor-text outline-none",
                        "[&_p]:m-0",
                        "[&_p+p]:mt-[1em]",
                        "[&_ul]:my-[1em]",
                        "[&_ul]:list-disc",
                        "[&_ul]:pl-6",
                        "[&_ol]:my-[1em]",
                        "[&_ol]:list-decimal",
                        "[&_ol]:pl-6",
                        "[&_a]:text-blue-600",
                        "[&_a]:underline",
                    ].join(" "),
                },
            },

            onFocus: ({ editor: currentEditor }) => {
                onSelectRef.current();
                onEditorReadyRef.current(currentEditor);
            },

            onUpdate: ({ editor: currentEditor }) => {
                onChangeRef.current(currentEditor.getHTML());
            },
        },
        [block.id],
    );

    useEffect(() => {
        if (selected && editor) {
            onEditorReadyRef.current(editor);
        }
    }, [selected, editor]);

    useEffect(() => {
        if (!editor || editor.getHTML() === block.content) {
            return;
        }

        editor.commands.setContent(block.content, {
            emitUpdate: false,
        });
    }, [editor, block.content]);

    const styles = block.styles;

    const selectBlock = () => {
        onSelect();

        if (editor) {
            onEditorReady(editor);
        }
    };

    return (
        <div
            style={{
                paddingTop: styles.padding.top,
                paddingRight: styles.padding.right,
                paddingBottom: styles.padding.bottom,
                paddingLeft: styles.padding.left,
                color: styles.color,
                fontSize: styles.fontSize,
                lineHeight: styles.lineHeight,
                textAlign: styles.textAlign,
                fontWeight:
                    block.type === "heading" ? 700 : 400,

                backgroundColor: selected
                    ? "rgba(15, 23, 42, 0.055)"
                    : "transparent",

                boxShadow: selected
                    ? "inset 0 0 0 2px rgba(59, 130, 246, 0.65)"
                    : "none",

                transition:
                    "background-color 120ms ease, box-shadow 120ms ease",
            }}
            onClick={selectBlock}
        >
            <EditorContent editor={editor} />
        </div>
    );
}
