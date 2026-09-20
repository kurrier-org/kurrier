import type {
    ButtonBlock, DividerBlock,
    EmailDocument,
    EmailDocumentSettings,
    HeadingBlock, ImageBlock, SpacerBlock,
    TextBlock,
} from "./types";

export type IdGenerator = () => string;

const generateId: IdGenerator = () => crypto.randomUUID();

export const defaultEmailDocumentSettings: EmailDocumentSettings = {
    contentWidth: 600,
    backgroundColor: "#f3f4f6",
    contentBackgroundColor: "#ffffff",
    fontFamily: "Arial, sans-serif",
    textColor: "#111827",
};

export const createButtonBlock = (
    overrides: Partial<Omit<ButtonBlock, "id" | "type">> = {},
    createId: IdGenerator = generateId,
): ButtonBlock => ({
    id: createId(),
    type: "button",
    text: overrides.text ?? "Click here",
    url: overrides.url ?? "https://example.com",
    styles: {
        backgroundColor:
            overrides.styles?.backgroundColor ?? "#2563eb",
        color: overrides.styles?.color ?? "#ffffff",
        fontSize: overrides.styles?.fontSize ?? 16,
        borderRadius: overrides.styles?.borderRadius ?? 6,
        alignment: overrides.styles?.alignment ?? "center",
        padding: {
            top: overrides.styles?.padding?.top ?? 16,
            right: overrides.styles?.padding?.right ?? 24,
            bottom: overrides.styles?.padding?.bottom ?? 16,
            left: overrides.styles?.padding?.left ?? 24,
        },
        buttonPadding: {
            vertical:
                overrides.styles?.buttonPadding?.vertical ?? 12,
            horizontal:
                overrides.styles?.buttonPadding?.horizontal ?? 20,
        },
    },
});

export const createHeadingBlock = (
    overrides: Partial<Omit<HeadingBlock, "id" | "type">> = {},
    createId: IdGenerator = generateId,
): HeadingBlock => ({
    id: createId(),
    type: "heading",
    content: overrides.content ?? "Add a heading",
    level: overrides.level ?? 2,
    styles: {
        color: overrides.styles?.color ?? "#111827",
        fontSize: overrides.styles?.fontSize ?? 28,
        lineHeight: overrides.styles?.lineHeight ?? 1.2,
        textAlign: overrides.styles?.textAlign ?? "left",
        padding: {
            top: overrides.styles?.padding?.top ?? 24,
            right: overrides.styles?.padding?.right ?? 24,
            bottom: overrides.styles?.padding?.bottom ?? 8,
            left: overrides.styles?.padding?.left ?? 24,
        },
    },
});

export const createTextBlock = (
    overrides: Partial<Omit<TextBlock, "id" | "type">> = {},
    createId: IdGenerator = generateId,
): TextBlock => ({
    id: createId(),
    type: "text",
    content: overrides.content ?? "<p>Start writing...</p>",
    styles: {
        color: overrides.styles?.color ?? "#111827",
        fontSize: overrides.styles?.fontSize ?? 16,
        lineHeight: overrides.styles?.lineHeight ?? 1.5,
        textAlign: overrides.styles?.textAlign ?? "left",
        padding: {
            top: overrides.styles?.padding?.top ?? 16,
            right: overrides.styles?.padding?.right ?? 24,
            bottom: overrides.styles?.padding?.bottom ?? 16,
            left: overrides.styles?.padding?.left ?? 24,
        },
    },
});

export const createEmailDocument = (
    createId: IdGenerator = generateId,
): EmailDocument => ({
    version: 1,
    settings: { ...defaultEmailDocumentSettings },
    blocks: [createTextBlock({}, createId)],
});


export const createImageBlock = (
    overrides: Partial<Omit<ImageBlock, "id" | "type">> = {},
    createId: IdGenerator = generateId,
): ImageBlock => ({
    id: createId(),
    type: "image",
    src: overrides.src ?? "",
    alt: overrides.alt ?? "",
    styles: {
        width: overrides.styles?.width ?? 552,
        borderRadius: overrides.styles?.borderRadius ?? 0,
        alignment: overrides.styles?.alignment ?? "center",
        padding: {
            top: overrides.styles?.padding?.top ?? 16,
            right: overrides.styles?.padding?.right ?? 24,
            bottom: overrides.styles?.padding?.bottom ?? 16,
            left: overrides.styles?.padding?.left ?? 24,
        },
    },
});

export const createDividerBlock = (
    overrides: Partial<
        Omit<DividerBlock, "id" | "type">
    > = {},
    createId: IdGenerator = generateId,
): DividerBlock => ({
    id: createId(),
    type: "divider",
    styles: {
        color: overrides.styles?.color ?? "#e5e7eb",
        thickness: overrides.styles?.thickness ?? 1,
        width: overrides.styles?.width ?? 100,
        style: overrides.styles?.style ?? "solid",
        alignment: overrides.styles?.alignment ?? "center",
        padding: {
            top: overrides.styles?.padding?.top ?? 16,
            right: overrides.styles?.padding?.right ?? 24,
            bottom: overrides.styles?.padding?.bottom ?? 16,
            left: overrides.styles?.padding?.left ?? 24,
        },
    },
});


export const createSpacerBlock = (
    overrides: Partial<
        Omit<SpacerBlock, "id" | "type">
    > = {},
    createId: IdGenerator = generateId,
): SpacerBlock => ({
    id: createId(),
    type: "spacer",
    height: overrides.height ?? 32,
});
