export type EmailDocumentVersion = 1;

export type EmailDocument = {
    version: EmailDocumentVersion;
    settings: EmailDocumentSettings;
    blocks: EmailBlock[];
};

export type EmailDocumentSettings = {
    contentWidth: number;
    backgroundColor: string;
    contentBackgroundColor: string;
    fontFamily: string;
    textColor: string;
};

export type EmailBlock =
    | TextBlock
    | HeadingBlock
    | ButtonBlock
    | ImageBlock
    | DividerBlock
    | SpacerBlock;

export type EmailBlockBase<TType extends string> = {
    id: string;
    type: TType;
};

export type BlockPadding = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

export type TextAlignment = "left" | "center" | "right";

export type RichTextBlockStyles = {
    color: string;
    fontSize: number;
    lineHeight: number;
    textAlign: TextAlignment;
    padding: BlockPadding;
};

export type TextBlock = EmailBlockBase<"text"> & {
    content: string;
    styles: RichTextBlockStyles;
};

export type HeadingBlock = EmailBlockBase<"heading"> & {
    content: string;
    level: 1 | 2 | 3;
    styles: RichTextBlockStyles;
};



export type ButtonBlock = EmailBlockBase<"button"> & {
    text: string;
    url: string;
    styles: {
        backgroundColor: string;
        color: string;
        fontSize: number;
        borderRadius: number;
        alignment: TextAlignment;
        padding: BlockPadding;
        buttonPadding: {
            vertical: number;
            horizontal: number;
        };
    };
};

export type ImageBlock = EmailBlockBase<"image"> & {
    src: string;
    alt: string;
    styles: {
        width: number;
        borderRadius: number;
        alignment: TextAlignment;
        padding: BlockPadding;
    };
};

export type DividerStyle =
    | "solid"
    | "dashed"
    | "dotted";

export type DividerBlock = EmailBlockBase<"divider"> & {
    styles: {
        color: string;
        thickness: number;
        width: number;
        style: DividerStyle;
        alignment: TextAlignment;
        padding: BlockPadding;
    };
};

export type SpacerBlock = EmailBlockBase<"spacer"> & {
    height: number;
};

export type EmailImageUploadHandler = (
    file: File,
) => Promise<string>;

export type EmailEditorVariable = {
    key: string;
    label?: string;
    example?: string;
};
