"use client";

import type { ImageBlock } from "../types";

type ImageBlockEditorProps = {
    block: ImageBlock;
    selected: boolean;
    onSelect: () => void;
};

export function ImageBlockEditor({
                                     block,
                                     selected,
                                     onSelect,
                                 }: ImageBlockEditorProps) {
    const { styles } = block;

    const justifyContent = {
        left: "flex-start",
        center: "center",
        right: "flex-end",
    }[styles.alignment];

    return (
        <div
            className={`flex transition-shadow ${
                selected
                    ? "ring-2 ring-blue-500 ring-inset"
                    : "hover:ring-1 hover:ring-blue-300"
            }`}
            style={{
                justifyContent,
                padding: `${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px`,
            }}
            onClick={onSelect}
        >
            {block.src ? (
                <img
                    src={block.src}
                    alt={block.alt}
                    className="block h-auto w-full"
                    style={{
                        maxWidth: styles.width,
                        borderRadius: styles.borderRadius,
                    }}
                />
            ) : (
                <div
                    className="flex h-40 w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
                    style={{ maxWidth: styles.width }}
                >
                    Add an image URL
                </div>
            )}
        </div>
    );
}
