"use client";

import type { ReactNode } from "react";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";

type SortableBlockProps = {
    id: string;
    children: ReactNode;
};

export function SortableBlock({
                                  id,
                                  children,
                              }: SortableBlockProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`group relative ${
                isDragging
                    ? "z-10 opacity-70 shadow-lg"
                    : ""
            }`}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
        >
            <button
                type="button"
                aria-label="Drag to reorder block"
                className="absolute left-1 top-1/2 z-20 flex h-8 w-6 -translate-y-1/2 cursor-grab items-center justify-center rounded border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground focus:opacity-100 active:cursor-grabbing group-hover:opacity-100"
                style={{
                    touchAction: "none",
                }}
                onClick={(event) =>
                    event.stopPropagation()
                }
                {...attributes}
                {...listeners}
            >
                <svg
                    width="14"
                    height="18"
                    viewBox="0 0 14 18"
                    fill="currentColor"
                    aria-hidden="true"
                >
                    <circle cx="4" cy="3" r="1.5" />
                    <circle cx="10" cy="3" r="1.5" />
                    <circle cx="4" cy="9" r="1.5" />
                    <circle cx="10" cy="9" r="1.5" />
                    <circle cx="4" cy="15" r="1.5" />
                    <circle cx="10" cy="15" r="1.5" />
                </svg>
            </button>

            {children}
        </div>
    );
}
