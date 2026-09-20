"use client";

import type { SpacerBlock } from "../types";

type SpacerBlockEditorProps = {
    block: SpacerBlock;
    selected: boolean;
    onSelect: () => void;
};

export function SpacerBlockEditor({
                                      block,
                                      selected,
                                      onSelect,
                                  }: SpacerBlockEditorProps) {
    const height = Math.max(4, block.height);

    return (
        <div
            className="flex items-center justify-center text-xs text-muted-foreground"
            style={{
                height,
                backgroundColor: selected
                    ? "rgba(59, 130, 246, 0.08)"
                    : "rgba(15, 23, 42, 0.025)",
                boxShadow: selected
                    ? "inset 0 0 0 2px rgba(59, 130, 246, 0.65)"
                    : "none",
            }}
            onClick={onSelect}
        >
            {selected && `Spacer · ${height}px`}
        </div>
    );
}
