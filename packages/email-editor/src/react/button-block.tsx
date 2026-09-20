"use client";

import type { ButtonBlock } from "../types";

type ButtonBlockEditorProps = {
    block: ButtonBlock;
    selected: boolean;
    onSelect: () => void;
};

export function ButtonBlockEditor({
                                      block,
                                      selected,
                                      onSelect,
                                  }: ButtonBlockEditorProps) {
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
    <button
        type="button"
    style={{
        backgroundColor: styles.backgroundColor,
            color: styles.color,
            fontSize: styles.fontSize,
            borderRadius: styles.borderRadius,
            padding: `${styles.buttonPadding.vertical}px ${styles.buttonPadding.horizontal}px`,
    }}
    className="border-0 font-semibold"
    onClick={(event) => {
        event.preventDefault();
        onSelect();
    }}
>
    {block.text}
    </button>
    </div>
);
}
