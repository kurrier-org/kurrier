import type {
    ButtonBlock,
    DividerBlock,
    EmailBlock,
    EmailDocument,
    HeadingBlock,
    ImageBlock,
    SpacerBlock,
    TextBlock,
} from "./types";

export type RenderEmailHtmlOptions = {
    previewText?: string;
};

const escapeHtml = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

const escapeAttribute = escapeHtml;

const renderTextBlock = (block: TextBlock): string => {
    const { styles } = block;

    return `
        <tr>
            <td
                style="
                    color: ${escapeAttribute(styles.color)};
                    font-size: ${styles.fontSize}px;
                    line-height: ${styles.lineHeight};
                    text-align: ${styles.textAlign};
                    padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px;
                "
            >
                ${block.content}
            </td>
        </tr>
    `;
};

const renderHeadingBlock = (
    block: HeadingBlock,
): string => {
    const { styles } = block;

    return `
        <tr>
            <td
                style="
                    color: ${escapeAttribute(styles.color)};
                    font-size: ${styles.fontSize}px;
                    font-weight: 700;
                    line-height: ${styles.lineHeight};
                    text-align: ${styles.textAlign};
                    padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px;
                "
            >
                <div
                    role="heading"
                    aria-level="${block.level}"
                >
                    ${block.content}
                </div>
            </td>
        </tr>
    `;
};

const renderButtonBlock = (
    block: ButtonBlock,
): string => {
    const { styles } = block;

    return `
        <tr>
            <td
                align="${styles.alignment}"
                style="
                    padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px;
                "
            >
                <table
                    role="presentation"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    align="${styles.alignment}"
                >
                    <tr>
                        <td
                            bgcolor="${escapeAttribute(
        styles.backgroundColor,
    )}"
                            style="
                                background-color: ${escapeAttribute(
        styles.backgroundColor,
    )};
                                border-radius: ${styles.borderRadius}px;
                            "
                        >
                            <a
                                href="${escapeAttribute(block.url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                style="
                                    display: inline-block;
                                    color: ${escapeAttribute(
        styles.color,
    )};
                                    font-size: ${styles.fontSize}px;
                                    font-weight: 600;
                                    text-decoration: none;
                                    padding: ${styles.buttonPadding.vertical}px ${styles.buttonPadding.horizontal}px;
                                    border-radius: ${styles.borderRadius}px;
                                "
                            >
                                ${escapeHtml(block.text)}
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `;
};

const renderImageBlock = (
    block: ImageBlock,
): string => {
    if (!block.src) {
        return "";
    }

    const { styles } = block;

    return `
        <tr>
            <td
                align="${styles.alignment}"
                style="
                    padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px;
                "
            >
                <img
                    src="${escapeAttribute(block.src)}"
                    alt="${escapeAttribute(block.alt)}"
                    width="${styles.width}"
                    style="
                        display: block;
                        width: 100%;
                        max-width: ${styles.width}px;
                        height: auto;
                        border: 0;
                        border-radius: ${styles.borderRadius}px;
                    "
                >
            </td>
        </tr>
    `;
};

const renderDividerBlock = (
    block: DividerBlock,
): string => {
    const { styles } = block;

    const width = Math.min(
        100,
        Math.max(1, styles.width),
    );

    const thickness = Math.max(
        1,
        styles.thickness,
    );

    return `
        <tr>
            <td
                style="
                    padding: ${styles.padding.top}px ${styles.padding.right}px ${styles.padding.bottom}px ${styles.padding.left}px;
                "
            >
                <table
                    role="presentation"
                    width="${width}%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    align="${styles.alignment}"
                    style="
                        width: ${width}%;
                    "
                >
                    <tr>
                        <td
                            style="
                                border-top: ${thickness}px ${styles.style} ${escapeAttribute(
        styles.color,
    )};
                                font-size: 0;
                                line-height: 0;
                            "
                        >
                            &nbsp;
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    `;
};

const renderSpacerBlock = (
    block: SpacerBlock,
): string => {
    const height = Math.max(0, block.height);

    return `
        <tr>
            <td
                height="${height}"
                style="
                    height: ${height}px;
                    font-size: 0;
                    line-height: ${height}px;
                "
            >
                &nbsp;
            </td>
        </tr>
    `;
};

const renderBlock = (block: EmailBlock): string => {
    switch (block.type) {
        case "text":
            return renderTextBlock(block);

        case "heading":
            return renderHeadingBlock(block);

        case "button":
            return renderButtonBlock(block);

        case "image":
            return renderImageBlock(block);

        case "divider":
            return renderDividerBlock(block);

        case "spacer":
            return renderSpacerBlock(block);
    }
};

const renderPreviewText = (
    previewText: string | undefined,
): string => {
    if (!previewText?.trim()) {
        return "";
    }

    return `
        <div
            aria-hidden="true"
            style="
                display: none;
                max-height: 0;
                max-width: 0;
                overflow: hidden;
                opacity: 0;
                color: transparent;
                font-size: 1px;
                line-height: 1px;
                mso-hide: all;
            "
        >
            ${escapeHtml(previewText.trim())}
        </div>
    `;
};


export const renderEmailFragment = (
    document: EmailDocument,
): string => {
    const { settings } = document;

    const content = document.blocks
        .map(renderBlock)
        .join("");

    return `
        <table
            role="presentation"
            width="${settings.contentWidth}"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
                width: 100%;
                max-width: ${settings.contentWidth}px;
                background-color: ${escapeAttribute(
        settings.contentBackgroundColor,
    )};
                font-family: ${escapeAttribute(
        settings.fontFamily,
    )};
                color: ${escapeAttribute(
        settings.textColor,
    )};
            "
        >
            ${content}
        </table>
    `;
};

export const renderEmailHtml = (
    document: EmailDocument,
    options: RenderEmailHtmlOptions = {},
): string => {
    const { settings } = document;

    const previewText = renderPreviewText(
        options.previewText,
    );

    const content =
        renderEmailFragment(document);

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
        >
        <meta
            name="x-apple-disable-message-reformatting"
        >
        <title></title>
    </head>

    <body
        style="
            margin: 0;
            padding: 0;
            background-color: ${escapeAttribute(
        settings.backgroundColor,
    )};
        "
    >
        ${previewText}

        <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
                width: 100%;
                background-color: ${escapeAttribute(
        settings.backgroundColor,
    )};
            "
        >
            <tr>
                <td align="center">
                    ${content}
                </td>
            </tr>
        </table>
    </body>
</html>`;
};
