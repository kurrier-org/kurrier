"use client";

import { useState } from "react";

import type {
    BlockPadding,
    ButtonBlock,
    DividerBlock,
    EmailBlock, EmailImageUploadHandler,
    HeadingBlock,
    ImageBlock,
    RichTextBlockStyles,
    SpacerBlock,
    TextAlignment,
    TextBlock,
} from "../types";


type RichTextBlock = TextBlock | HeadingBlock;

type BlockInspectorProps = {
    block: EmailBlock | null;
    onChange: (block: EmailBlock) => void;
    onImageUpload?: EmailImageUploadHandler;
};

const inputClass =
    "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500";

const labelClass = "grid gap-1.5 text-sm";

type NumberFieldProps = {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
};

function NumberField({
                         label,
                         value,
                         min,
                         max,
                         step,
                         onChange,
                     }: NumberFieldProps) {
    return (
        <label className={labelClass}>
            <span>{label}</span>

            <input
                type="number"
                className={inputClass}
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(event) => {
                    const nextValue =
                        event.currentTarget.valueAsNumber;

                    if (!Number.isNaN(nextValue)) {
                        onChange(nextValue);
                    }
                }}
            />
        </label>
    );
}

type ColorFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
};

function ColorField({
                        label,
                        value,
                        onChange,
                    }: ColorFieldProps) {
    return (
        <label className={labelClass}>
            <span>{label}</span>

            <div className="flex items-center gap-2">
                <input
                    type="color"
                    className="h-9 w-12 rounded-md border bg-background p-1"
                    value={value}
                    onChange={(event) =>
                        onChange(
                            event.currentTarget.value,
                        )
                    }
                />

                <input
                    type="text"
                    className={inputClass}
                    value={value}
                    onChange={(event) =>
                        onChange(
                            event.currentTarget.value,
                        )
                    }
                />
            </div>
        </label>
    );
}

type AlignmentFieldProps = {
    value: TextAlignment;
    onChange: (value: TextAlignment) => void;
};

function AlignmentField({
                            value,
                            onChange,
                        }: AlignmentFieldProps) {
    return (
        <div className={labelClass}>
            <span>Alignment</span>

            <div className="grid grid-cols-3 gap-2">
                {(
                    [
                        "left",
                        "center",
                        "right",
                    ] as const
                ).map((alignment) => (
                    <button
                        key={alignment}
                        type="button"
                        aria-pressed={
                            value === alignment
                        }
                        className={`rounded-md border px-2 py-2 text-sm capitalize ${
                            value === alignment
                                ? "border-blue-500 bg-blue-50 text-blue-700"
                                : "bg-background"
                        }`}
                        onClick={() =>
                            onChange(alignment)
                        }
                    >
                        {alignment}
                    </button>
                ))}
            </div>
        </div>
    );
}

type PaddingFieldsProps = {
    padding: BlockPadding;
    onChange: (padding: BlockPadding) => void;
};

function PaddingFields({
                           padding,
                           onChange,
                       }: PaddingFieldsProps) {
    return (
        <div className={labelClass}>
            <span>Outer padding</span>

            <div className="grid grid-cols-2 gap-2">
                {(
                    [
                        "top",
                        "right",
                        "bottom",
                        "left",
                    ] as const
                ).map((side) => (
                    <label
                        key={side}
                        className="grid gap-1"
                    >
                        <span className="text-xs capitalize text-muted-foreground">
                            {side}
                        </span>

                        <input
                            type="number"
                            min={0}
                            max={200}
                            className={inputClass}
                            value={padding[side]}
                            onChange={(event) => {
                                const value =
                                    event.currentTarget
                                        .valueAsNumber;

                                if (
                                    !Number.isNaN(value)
                                ) {
                                    onChange({
                                        ...padding,
                                        [side]: value,
                                    });
                                }
                            }}
                        />
                    </label>
                ))}
            </div>
        </div>
    );
}

type RichTextInspectorProps = {
    block: RichTextBlock;
    onChange: (block: RichTextBlock) => void;
};

function RichTextInspector({
                               block,
                               onChange,
                           }: RichTextInspectorProps) {
    const updateStyles = (
        styles: Partial<RichTextBlockStyles>,
    ) => {
        onChange({
            ...block,
            styles: {
                ...block.styles,
                ...styles,
            },
        });
    };

    return (
        <>
            {block.type === "heading" && (
                <label className={labelClass}>
                    <span>Heading level</span>

                    <select
                        className={inputClass}
                        value={block.level}
                        onChange={(event) =>
                            onChange({
                                ...block,
                                level: Number(
                                    event
                                        .currentTarget
                                        .value,
                                ) as HeadingBlock["level"],
                            })
                        }
                    >
                        <option value={1}>
                            Heading 1
                        </option>

                        <option value={2}>
                            Heading 2
                        </option>

                        <option value={3}>
                            Heading 3
                        </option>
                    </select>
                </label>
            )}

            <NumberField
                label="Font size"
                value={block.styles.fontSize}
                min={8}
                max={96}
                onChange={(fontSize) =>
                    updateStyles({ fontSize })
                }
            />

            <NumberField
                label="Line height"
                value={block.styles.lineHeight}
                min={0.8}
                max={3}
                step={0.1}
                onChange={(lineHeight) =>
                    updateStyles({ lineHeight })
                }
            />

            <ColorField
                label="Text colour"
                value={block.styles.color}
                onChange={(color) =>
                    updateStyles({ color })
                }
            />

            <AlignmentField
                value={block.styles.textAlign}
                onChange={(textAlign) =>
                    updateStyles({ textAlign })
                }
            />

            <PaddingFields
                padding={block.styles.padding}
                onChange={(padding) =>
                    updateStyles({ padding })
                }
            />
        </>
    );
}

type ButtonInspectorProps = {
    block: ButtonBlock;
    onChange: (block: ButtonBlock) => void;
};

function ButtonInspector({
                             block,
                             onChange,
                         }: ButtonInspectorProps) {
    const updateStyles = (
        styles: Partial<ButtonBlock["styles"]>,
    ) => {
        onChange({
            ...block,
            styles: {
                ...block.styles,
                ...styles,
            },
        });
    };

    return (
        <>
            <label className={labelClass}>
                <span>Label</span>

                <input
                    type="text"
                    className={inputClass}
                    value={block.text}
                    onChange={(event) =>
                        onChange({
                            ...block,
                            text: event.currentTarget
                                .value,
                        })
                    }
                />
            </label>

            <label className={labelClass}>
                <span>URL</span>

                <input
                    type="url"
                    className={inputClass}
                    value={block.url}
                    onChange={(event) =>
                        onChange({
                            ...block,
                            url: event.currentTarget
                                .value,
                        })
                    }
                />
            </label>

            <NumberField
                label="Font size"
                value={block.styles.fontSize}
                min={8}
                max={48}
                onChange={(fontSize) =>
                    updateStyles({ fontSize })
                }
            />

            <ColorField
                label="Background colour"
                value={
                    block.styles.backgroundColor
                }
                onChange={(backgroundColor) =>
                    updateStyles({
                        backgroundColor,
                    })
                }
            />

            <ColorField
                label="Text colour"
                value={block.styles.color}
                onChange={(color) =>
                    updateStyles({ color })
                }
            />

            <NumberField
                label="Border radius"
                value={block.styles.borderRadius}
                min={0}
                max={100}
                onChange={(borderRadius) =>
                    updateStyles({ borderRadius })
                }
            />

            <AlignmentField
                value={block.styles.alignment}
                onChange={(alignment) =>
                    updateStyles({ alignment })
                }
            />

            <PaddingFields
                padding={block.styles.padding}
                onChange={(padding) =>
                    updateStyles({ padding })
                }
            />

            <div className="grid grid-cols-2 gap-2">
                <NumberField
                    label="Button vertical"
                    value={
                        block.styles.buttonPadding
                            .vertical
                    }
                    min={0}
                    max={100}
                    onChange={(vertical) =>
                        updateStyles({
                            buttonPadding: {
                                ...block.styles
                                    .buttonPadding,
                                vertical,
                            },
                        })
                    }
                />

                <NumberField
                    label="Button horizontal"
                    value={
                        block.styles.buttonPadding
                            .horizontal
                    }
                    min={0}
                    max={200}
                    onChange={(horizontal) =>
                        updateStyles({
                            buttonPadding: {
                                ...block.styles
                                    .buttonPadding,
                                horizontal,
                            },
                        })
                    }
                />
            </div>
        </>
    );
}

type ImageInspectorProps = {
    block: ImageBlock;
    onChange: (block: ImageBlock) => void;
    onImageUpload?: EmailImageUploadHandler;
};

function ImageInspector({
                            block,
                            onChange,
                            onImageUpload,
                        }: ImageInspectorProps) {
    const [uploading, setUploading] =
        useState(false);

    const [uploadError, setUploadError] =
        useState<string | null>(null);

    const updateStyles = (
        styles: Partial<ImageBlock["styles"]>,
    ) => {
        onChange({
            ...block,
            styles: {
                ...block.styles,
                ...styles,
            },
        });
    };

    const uploadImage = async (
        file: File,
    ) => {
        if (!onImageUpload) {
            return;
        }

        setUploading(true);
        setUploadError(null);

        try {
            const url =
                await onImageUpload(file);

            onChange({
                ...block,
                src: url,
                alt: block.alt || file.name,
            });
        } catch (error) {
            setUploadError(
                error instanceof Error
                    ? error.message
                    : "Image upload failed",
            );
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            {onImageUpload && (
                <div className={labelClass}>
                    <span>Upload image</span>

                    <label
                        className={[
                            "flex h-10 items-center justify-center",
                            "rounded-md border bg-background px-3",
                            "cursor-pointer text-sm hover:bg-muted",
                            uploading
                                ? "pointer-events-none opacity-50"
                                : "",
                        ].join(" ")}
                    >
                        {uploading
                            ? "Uploading…"
                            : "Choose image"}

                        <input
                            type="file"
                            className="sr-only"
                            accept={[
                                "image/jpeg",
                                "image/png",
                                "image/gif",
                                "image/webp",
                            ].join(",")}
                            disabled={uploading}
                            onChange={async (
                                event,
                            ) => {
                                const input =
                                    event.currentTarget;

                                const file =
                                    input.files?.[0];

                                if (file) {
                                    await uploadImage(
                                        file,
                                    );
                                }

                                input.value = "";
                            }}
                        />
                    </label>

                    {uploadError && (
                        <p className="text-xs text-red-600">
                            {uploadError}
                        </p>
                    )}
                </div>
            )}

            <label className={labelClass}>
                <span>Image URL</span>

                <input
                    type="url"
                    className={inputClass}
                    value={block.src}
                    onChange={(event) =>
                        onChange({
                            ...block,
                            src: event.currentTarget
                                .value,
                        })
                    }
                />
            </label>

            <label className={labelClass}>
                <span>Alternative text</span>

                <input
                    type="text"
                    className={inputClass}
                    value={block.alt}
                    onChange={(event) =>
                        onChange({
                            ...block,
                            alt: event.currentTarget
                                .value,
                        })
                    }
                />
            </label>

            <NumberField
                label="Width"
                value={block.styles.width}
                min={40}
                max={1200}
                onChange={(width) =>
                    updateStyles({ width })
                }
            />

            <NumberField
                label="Border radius"
                value={
                    block.styles.borderRadius
                }
                min={0}
                max={200}
                onChange={(borderRadius) =>
                    updateStyles({ borderRadius })
                }
            />

            <AlignmentField
                value={block.styles.alignment}
                onChange={(alignment) =>
                    updateStyles({ alignment })
                }
            />

            <PaddingFields
                padding={block.styles.padding}
                onChange={(padding) =>
                    updateStyles({ padding })
                }
            />
        </>
    );
}

type DividerInspectorProps = {
    block: DividerBlock;
    onChange: (block: DividerBlock) => void;
};

function DividerInspector({
                              block,
                              onChange,
                          }: DividerInspectorProps) {
    const updateStyles = (
        styles: Partial<DividerBlock["styles"]>,
    ) => {
        onChange({
            ...block,
            styles: {
                ...block.styles,
                ...styles,
            },
        });
    };

    return (
        <>
            <ColorField
                label="Divider colour"
                value={block.styles.color}
                onChange={(color) =>
                    updateStyles({ color })
                }
            />

            <NumberField
                label="Thickness"
                value={block.styles.thickness}
                min={1}
                max={20}
                onChange={(thickness) =>
                    updateStyles({ thickness })
                }
            />

            <NumberField
                label="Width (%)"
                value={block.styles.width}
                min={1}
                max={100}
                onChange={(width) =>
                    updateStyles({ width })
                }
            />

            <label className={labelClass}>
                <span>Line style</span>

                <select
                    className={inputClass}
                    value={block.styles.style}
                    onChange={(event) =>
                        updateStyles({
                            style: event
                                .currentTarget
                                .value as DividerBlock["styles"]["style"],
                        })
                    }
                >
                    <option value="solid">
                        Solid
                    </option>

                    <option value="dashed">
                        Dashed
                    </option>

                    <option value="dotted">
                        Dotted
                    </option>
                </select>
            </label>

            <AlignmentField
                value={block.styles.alignment}
                onChange={(alignment) =>
                    updateStyles({ alignment })
                }
            />

            <PaddingFields
                padding={block.styles.padding}
                onChange={(padding) =>
                    updateStyles({ padding })
                }
            />
        </>
    );
}

type SpacerInspectorProps = {
    block: SpacerBlock;
    onChange: (block: SpacerBlock) => void;
};

function SpacerInspector({
                             block,
                             onChange,
                         }: SpacerInspectorProps) {
    return (
        <NumberField
            label="Height"
            value={block.height}
            min={4}
            max={400}
            onChange={(height) =>
                onChange({
                    ...block,
                    height,
                })
            }
        />
    );
}

export function BlockInspector({
                                   block,
                                   onChange,
                                   onImageUpload,
                               }: BlockInspectorProps) {
    if (!block) {
        return (
            <aside className="h-full overflow-y-auto border-l bg-background p-4 text-sm text-muted-foreground">
                Select a block to edit its settings.
            </aside>
        );
    }

    return (
        <aside className="h-full overflow-y-auto bg-background">
            <div className="border-b p-4">
                <p className="text-sm font-semibold capitalize">
                    {block.type} block
                </p>
            </div>

            <div className="grid gap-5 p-4">
                {block.type === "button" ? (
                    <ButtonInspector
                        block={block}
                        onChange={onChange}
                    />
                ) : block.type === "image" ? (
                    <ImageInspector
                        block={block}
                        onChange={onChange}
                        onImageUpload={
                            onImageUpload
                        }
                    />
                ) : block.type ===
                "divider" ? (
                    <DividerInspector
                        block={block}
                        onChange={onChange}
                    />
                ) : block.type ===
                "spacer" ? (
                    <SpacerInspector
                        block={block}
                        onChange={onChange}
                    />
                ) : (
                    <RichTextInspector
                        block={block}
                        onChange={onChange}
                    />
                )}
            </div>
        </aside>
    );
}
