import type {
    EmailDocument,
} from "./types";
import type {
    EmailTemplateVariables,
    MissingVariableBehaviour,
} from "./variables";
import {
    resolveEmailDocumentVariables,
    resolveTemplateString,
} from "./variables";
import {
    renderEmailHtml,
} from "./renderer";

export type RenderEmailTemplateInput = {
    document: EmailDocument;
    subject?: string;
    previewText?: string;
    variables?: EmailTemplateVariables;
    missingVariable?: MissingVariableBehaviour;
};

export type RenderedEmailTemplate = {
    subject: string;
    previewText: string;
    html: string;
    text: string;
};

const decodeHtmlEntities = (
    value: string,
): string =>
    value
        .replace(
            /&#x([0-9a-f]+);/gi,
            (_match, code: string) =>
                String.fromCodePoint(
                    Number.parseInt(code, 16),
                ),
        )
        .replace(
            /&#(\d+);/g,
            (_match, code: string) =>
                String.fromCodePoint(
                    Number.parseInt(code, 10),
                ),
        )
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'");

export const htmlToPlainText = (
    html: string,
): string =>
    decodeHtmlEntities(
        html
            .replace(
                /<br\s*\/?>/gi,
                "\n",
            )
            .replace(
                /<\/(p|div|h[1-6]|blockquote)>/gi,
                "\n",
            )
            .replace(
                /<li[^>]*>/gi,
                "- ",
            )
            .replace(
                /<\/li>/gi,
                "\n",
            )
            .replace(
                /<[^>]+>/g,
                "",
            ),
    )
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

export function renderEmailText(
    document: EmailDocument,
): string {
    return document.blocks
        .map((block) => {
            switch (block.type) {
                case "text":
                case "heading":
                    return htmlToPlainText(
                        block.content,
                    );

                case "button": {
                    const text =
                        block.text.trim();
                    const url =
                        block.url.trim();

                    if (text && url) {
                        return `${text}: ${url}`;
                    }

                    return text || url;
                }

                case "image":
                    return block.alt.trim();

                case "divider":
                    return "---";

                case "spacer":
                    return "";
            }
        })
        .filter(Boolean)
        .join("\n\n")
        .trim();
}

export function renderEmailTemplate({
                                        document,
                                        subject = "",
                                        previewText = "",
                                        variables = {},
                                        missingVariable = "preserve",
                                    }: RenderEmailTemplateInput): RenderedEmailTemplate {
    const resolvedDocument =
        resolveEmailDocumentVariables(
            document,
            variables,
            {
                missing: missingVariable,
            },
        );

    const resolvedSubject =
        resolveTemplateString(
            subject,
            variables,
            {
                missing: missingVariable,
            },
        );

    const resolvedPreviewText =
        resolveTemplateString(
            previewText,
            variables,
            {
                missing: missingVariable,
            },
        );

    return {
        subject: resolvedSubject,
        previewText:
        resolvedPreviewText,
        html: renderEmailHtml(
            resolvedDocument,
            {
                previewText:
                resolvedPreviewText,
            },
        ),
        text: renderEmailText(
            resolvedDocument,
        ),
    };
}
