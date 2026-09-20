"use client";

import type { DividerBlock } from "../types";

type DividerBlockEditorProps = {
    block: DividerBlock;
    selected: boolean;
    onSelect: () => void;
};

export function DividerBlockEditor({
                                       block,
                                       selected,
                                       onSelect,
                                   }: DividerBlockEditorProps) {
    const { styles } = block;

    const justifyContent = {
        left: "flex-start",
        center: "center",
        right: "flex-end",
    }[styles.alignment];

    const width = Math.min(
        100,
        Math.max(1, styles.width),
    );

    return (
        <div
            className={`flex transition-shadow ${
                selected
                    ? "bg-slate-100 ring-2 ring-blue-500 ring-inset"
                    : "hover:bg-slate-50 hover:ring-1 hover:ring-blue-300"
            }`}
            style={{
                justifyContent,
                padding: `${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px`,
            }}
            onClick={onSelect}
        >
            <div
                style={{
                    width: `${width}%`,
                    borderTop: `${Math.max(
                        1,
                        styles.thickness,
                    )}px ${styles.style} ${styles.color}`,
                }}
            />
        </div>
    );
}
