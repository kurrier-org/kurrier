"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import {
    closestCenter,
    DndContext,
    KeyboardSensor,
    PointerSensor,
    type DragEndEvent,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    ArrowDown,
    ArrowUp,
    Copy,
    Heading1,
    ImagePlus,
    Minus,
    MousePointerClick,
    Redo2,
    Settings2,
    Space,
    Trash2,
    Type,
    Undo2,
} from "lucide-react";

import {
    addBlock,
    duplicateBlock,
    moveBlock,
    removeBlock,
    updateBlock,
} from "../commands";
import {
    createButtonBlock,
    createDividerBlock,
    createHeadingBlock,
    createImageBlock,
    createSpacerBlock,
    createTextBlock,
} from "../document";
import type {
    EmailBlock,
    EmailDocument,
    EmailEditorVariable,
    EmailImageUploadHandler,
} from "../types";
import { BlockInspector } from "./block-inspector";
import { ButtonBlockEditor } from "./button-block";
import { DividerBlockEditor } from "./divider-block";
import { DocumentInspector } from "./document-inspector";
import { ImageBlockEditor } from "./image-block";
import { SortableBlock } from "./sortable-block";
import { SpacerBlockEditor } from "./spacer-block";
import { RichTextBlockEditor, RichTextToolbar } from "./text-block";
import { useEditorHistory } from "./use-editor-history";
import { VariablePicker } from "./variable-picker";

export type EmailEditorPreset = "email" | "signature";

type EmailEditorDictionary = Partial<
    Record<
        | "editorText"
        | "editorHeading"
        | "editorButton"
        | "editorImage"
        | "editorDivider"
        | "editorSpacer"
        | "editorUndo"
        | "editorRedo"
        | "editorEmailSettings"
        | "editorMoveUp"
        | "editorMoveDown"
        | "editorDuplicate"
        | "editorAddFirstBlock"
        | "delete",
        string
    >
>;

type EmailEditorProps = {
    value: EmailDocument;
    onChange: (document: EmailDocument) => void;
    onImageUpload?: EmailImageUploadHandler;
    variables?: EmailEditorVariable[];
    preset?: EmailEditorPreset;
    dictionary?: EmailEditorDictionary;
};

const toolbarGroupClass =
    "flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-800 dark:bg-neutral-950";

type ToolbarButtonProps = {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    destructive?: boolean;
    showLabel?: boolean;
};

function ToolbarButton({
                           label,
                           icon,
                           onClick,
                           disabled = false,
                           active = false,
                           destructive = false,
                           showLabel = false,
                       }: ToolbarButtonProps) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onClick={onClick}
            className={[
                "inline-flex h-9 items-center justify-center gap-2 rounded-md px-2.5",
                "text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                "disabled:pointer-events-none disabled:opacity-35",
                destructive
                    ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    : active
                        ? "bg-brand/10 text-brand dark:bg-brand/30 dark:text-brand-foreground"
                        : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                showLabel ? "" : "w-9 px-0",
            ].join(" ")}
        >
            <span className="shrink-0">{icon}</span>
            {showLabel && <span className="whitespace-nowrap">{label}</span>}
        </button>
    );
}

export function EmailEditor({
                                value,
                                onChange,
                                onImageUpload,
                                variables = [],
                                preset = "email",
                                dictionary,
                            }: EmailEditorProps) {
    const isSignature = preset === "signature";

    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
        value.blocks[0]?.id ?? null
    );

    const [activeTextEditor, setActiveTextEditor] = useState<{
        blockId: string;
        editor: Editor;
    } | null>(null);

    const { commit, undo, redo, canUndo, canRedo } = useEditorHistory(
        value,
        onChange
    );

    const selectedIndex = value.blocks.findIndex(
        (block) => block.id === selectedBlockId
    );

    const selectedBlock =
        selectedIndex === -1 ? null : value.blocks[selectedIndex];

    const addText = () => {
        const block = createTextBlock();
        commit(addBlock(value, block));
        setSelectedBlockId(block.id);
    };

    const addHeading = () => {
        const block = createHeadingBlock();
        commit(addBlock(value, block));
        setSelectedBlockId(block.id);
    };

    const addButton = () => {
        const block = createButtonBlock();
        commit(addBlock(value, block));
        setSelectedBlockId(block.id);
    };

    const addImage = () => {
        const block = createImageBlock();
        commit(addBlock(value, block));
        setSelectedBlockId(block.id);
    };

    const addDivider = () => {
        const block = createDividerBlock();
        commit(addBlock(value, block));
        setSelectedBlockId(block.id);
    };

    const addSpacer = () => {
        const block = createSpacerBlock();
        commit(addBlock(value, block));
        setSelectedBlockId(block.id);
    };

    const duplicateSelected = () => {
        if (!selectedBlockId || selectedIndex === -1) return;

        const nextDocument = duplicateBlock(value, selectedBlockId);
        commit(nextDocument);

        setSelectedBlockId(
            nextDocument.blocks[selectedIndex + 1]?.id ?? selectedBlockId
        );
    };

    const deleteSelected = () => {
        if (!selectedBlockId || selectedIndex === -1) return;

        const nextDocument = removeBlock(value, selectedBlockId);
        commit(nextDocument);

        setSelectedBlockId(
            nextDocument.blocks[
                Math.min(selectedIndex, nextDocument.blocks.length - 1)
                ]?.id ?? null
        );
    };

    const moveSelected = (offset: number) => {
        if (!selectedBlockId || selectedIndex === -1) return;
        commit(moveBlock(value, selectedBlockId, selectedIndex + offset));
    };

    const changeSelectedBlock = (block: EmailBlock) => {
        commit(
            updateBlock(value, block.id, () => block),
            `settings:${block.id}`
        );
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) return;

        const targetIndex = value.blocks.findIndex(
            (block) => block.id === over.id
        );

        if (targetIndex === -1) return;

        const activeId = String(active.id);
        setSelectedBlockId(activeId);
        commit(moveBlock(value, activeId, targetIndex), `reorder:${activeId}`);
    };

    return (
        <div
            className={[
                "flex h-full flex-col overflow-hidden rounded-lg border bg-background",
                isSignature ? "min-h-[520px]" : "min-h-[700px]",
            ].join(" ")}
            onKeyDown={(event) => {
                if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key.toLowerCase() === "z"
                ) {
                    event.preventDefault();

                    if (event.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                }
            }}
        >
            <div className="flex flex-wrap items-center gap-2 border-b bg-neutral-50/60 p-2 dark:bg-neutral-900/40">
                <div className={toolbarGroupClass}>
                    <ToolbarButton
                        label={dictionary?.editorText ?? "Text"}
                        icon={<Type size={16} />}
                        onClick={addText}
                        showLabel
                    />

                    {!isSignature && (
                        <>
                            <ToolbarButton
                                label={dictionary?.editorHeading ?? "Heading"}
                                icon={<Heading1 size={16} />}
                                onClick={addHeading}
                                showLabel
                            />
                            <ToolbarButton
                                label={dictionary?.editorButton ?? "Button"}
                                icon={<MousePointerClick size={16} />}
                                onClick={addButton}
                                showLabel
                            />
                        </>
                    )}

                    <ToolbarButton
                        label={dictionary?.editorImage ?? "Image"}
                        icon={<ImagePlus size={16} />}
                        onClick={addImage}
                        showLabel
                    />

                    <ToolbarButton
                        label={dictionary?.editorDivider ?? "Divider"}
                        icon={<Minus size={16} />}
                        onClick={addDivider}
                        showLabel
                    />

                    {!isSignature && (
                        <ToolbarButton
                            label={dictionary?.editorSpacer ?? "Spacer"}
                            icon={<Space size={16} />}
                            onClick={addSpacer}
                            showLabel
                        />
                    )}
                </div>

                <div className={toolbarGroupClass}>
                    <ToolbarButton
                        label={dictionary?.editorUndo ?? "Undo"}
                        icon={<Undo2 size={16} />}
                        disabled={!canUndo}
                        onClick={undo}
                    />
                    <ToolbarButton
                        label={dictionary?.editorRedo ?? "Redo"}
                        icon={<Redo2 size={16} />}
                        disabled={!canRedo}
                        onClick={redo}
                    />
                </div>

                {!isSignature && (
                    <div className={toolbarGroupClass}>
                        <ToolbarButton
                            label={
                                dictionary?.editorEmailSettings ??
                                "Email settings"
                            }
                            icon={<Settings2 size={16} />}
                            active={selectedBlockId === null}
                            onClick={() => setSelectedBlockId(null)}
                        />
                    </div>
                )}

                <div className={toolbarGroupClass}>
                    <ToolbarButton
                        label={dictionary?.editorMoveUp ?? "Move up"}
                        icon={<ArrowUp size={16} />}
                        disabled={selectedIndex <= 0}
                        onClick={() => moveSelected(-1)}
                    />
                    <ToolbarButton
                        label={dictionary?.editorMoveDown ?? "Move down"}
                        icon={<ArrowDown size={16} />}
                        disabled={
                            selectedIndex === -1 ||
                            selectedIndex === value.blocks.length - 1
                        }
                        onClick={() => moveSelected(1)}
                    />
                    <ToolbarButton
                        label={dictionary?.editorDuplicate ?? "Duplicate"}
                        icon={<Copy size={16} />}
                        disabled={selectedIndex === -1}
                        onClick={duplicateSelected}
                    />
                    <ToolbarButton
                        label={dictionary?.delete ?? "Delete"}
                        icon={<Trash2 size={16} />}
                        disabled={selectedIndex === -1}
                        destructive
                        onClick={deleteSelected}
                    />
                </div>
            </div>

            {selectedBlock &&
                (selectedBlock.type === "text" ||
                    selectedBlock.type === "heading") && (
                    <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-3 py-2">
                        <div className="min-w-0 overflow-x-auto">
                            <RichTextToolbar
                                editor={
                                    activeTextEditor?.blockId ===
                                    selectedBlock.id
                                        ? activeTextEditor.editor
                                        : null
                                }
                                showLists={selectedBlock.type === "text"}
                            />
                        </div>

                        {variables.length > 0 && (
                            <div className="sm:ml-auto">
                                <VariablePicker
                                    editor={
                                        activeTextEditor?.blockId ===
                                        selectedBlock.id
                                            ? activeTextEditor.editor
                                            : null
                                    }
                                    variables={variables}
                                />
                            </div>
                        )}
                    </div>
                )}

            <div
                className={[
                    "grid min-h-0 flex-1 grid-cols-1",
                    isSignature
                        ? "lg:grid-cols-[minmax(0,1fr)_280px]"
                        : "xl:grid-cols-[minmax(0,1fr)_280px]",
                ].join(" ")}
            >
                <div
                    className="min-h-[320px] overflow-auto p-3 sm:p-5 lg:p-8"
                    style={{
                        backgroundColor: value.settings.backgroundColor,
                    }}
                >
                    <div
                        className="mx-auto min-h-40 shadow-sm"
                        style={{
                            maxWidth: value.settings.contentWidth,
                            backgroundColor:
                            value.settings.contentBackgroundColor,
                            fontFamily: value.settings.fontFamily,
                            color: value.settings.textColor,
                        }}
                    >
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={value.blocks.map((block) => block.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {value.blocks.map((block) => (
                                    <SortableBlock key={block.id} id={block.id}>
                                        {block.type === "image" ? (
                                            <ImageBlockEditor
                                                block={block}
                                                selected={
                                                    block.id === selectedBlockId
                                                }
                                                onSelect={() =>
                                                    setSelectedBlockId(block.id)
                                                }
                                            />
                                        ) : block.type === "button" ? (
                                            <ButtonBlockEditor
                                                block={block}
                                                selected={
                                                    block.id === selectedBlockId
                                                }
                                                onSelect={() =>
                                                    setSelectedBlockId(block.id)
                                                }
                                            />
                                        ) : block.type === "divider" ? (
                                            <DividerBlockEditor
                                                block={block}
                                                selected={
                                                    block.id === selectedBlockId
                                                }
                                                onSelect={() =>
                                                    setSelectedBlockId(block.id)
                                                }
                                            />
                                        ) : block.type === "spacer" ? (
                                            <SpacerBlockEditor
                                                block={block}
                                                selected={
                                                    block.id === selectedBlockId
                                                }
                                                onSelect={() =>
                                                    setSelectedBlockId(block.id)
                                                }
                                            />
                                        ) : (
                                            <RichTextBlockEditor
                                                block={block}
                                                selected={
                                                    block.id === selectedBlockId
                                                }
                                                onSelect={() =>
                                                    setSelectedBlockId(block.id)
                                                }
                                                onEditorReady={(editor) =>
                                                    setActiveTextEditor({
                                                        blockId: block.id,
                                                        editor,
                                                    })
                                                }
                                                onChange={(content) =>
                                                    commit(
                                                        updateBlock(
                                                            value,
                                                            block.id,
                                                            (current) => ({
                                                                ...current,
                                                                content,
                                                            })
                                                        ),
                                                        `content:${block.id}`
                                                    )
                                                }
                                            />
                                        )}
                                    </SortableBlock>
                                ))}
                            </SortableContext>
                        </DndContext>

                        {value.blocks.length === 0 && (
                            <button
                                type="button"
                                className="w-full p-12 text-sm text-muted-foreground"
                                onClick={addText}
                            >
                                {dictionary?.editorAddFirstBlock ??
                                    "Add your first block"}
                            </button>
                        )}
                    </div>
                </div>

                {!isSignature && selectedBlockId === null ? (
                    <DocumentInspector
                        settings={value.settings}
                        onChange={(settings) =>
                            commit(
                                { ...value, settings },
                                "document-settings"
                            )
                        }
                    />
                ) : (
                    <BlockInspector
                        block={selectedBlock}
                        onChange={changeSelectedBlock}
                        onImageUpload={onImageUpload}
                    />
                )}
            </div>
        </div>
    );
}
