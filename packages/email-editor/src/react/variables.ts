import type {
    EmailBlock,
    EmailDocument,
} from "../types";

export type EmailTemplateVariables = Record<
    string,
    string | number | boolean | null | undefined
>;

export type MissingVariableBehaviour =
    | "preserve"
    | "empty"
    | "error";

export type ResolveTemplateOptions = {
    missing?: MissingVariableBehaviour;
    transform?: (value: string) => string;
};

const variablePattern =
    /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.-]*)\s*\}\}/g;

const escapeHtml = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

export function resolveTemplateString(
    input: string,
    variables: EmailTemplateVariables,
    options: ResolveTemplateOptions = {},
): string {
    const {
        missing = "preserve",
        transform = (value) => value,
    } = options;

    return input.replace(
        variablePattern,
        (placeholder, key: string) => {
            const value = variables[key];

            if (
                value === undefined ||
                value === null
            ) {
                if (missing === "empty") {
                    return "";
                }

                if (missing === "error") {
                    throw new Error(
                        `Missing template variable: ${key}`,
                    );
                }

                return placeholder;
            }

            return transform(String(value));
        },
    );
}

export function extractTemplateVariables(
    input: string,
): string[] {
    return Array.from(
        input.matchAll(variablePattern),
        (match) => match[1],
    ).filter(
        (key, index, keys) =>
            keys.indexOf(key) === index,
    );
}

function resolveBlockVariables(
    block: EmailBlock,
    variables: EmailTemplateVariables,
    missing: MissingVariableBehaviour,
): EmailBlock {
    switch (block.type) {
        case "text":
        case "heading":
            return {
                ...block,
                content: resolveTemplateString(
                    block.content,
                    variables,
                    {
                        missing,
                        transform: escapeHtml,
                    },
                ),
            };

        case "button":
            return {
                ...block,
                text: resolveTemplateString(
                    block.text,
                    variables,
                    { missing },
                ),
                url: resolveTemplateString(
                    block.url,
                    variables,
                    { missing },
                ),
            };

        case "image":
            return {
                ...block,
                src: resolveTemplateString(
                    block.src,
                    variables,
                    { missing },
                ),
                alt: resolveTemplateString(
                    block.alt,
                    variables,
                    { missing },
                ),
            };

        case "divider":
        case "spacer":
            return {
                ...block,
            };
    }
}

export function resolveEmailDocumentVariables(
    document: EmailDocument,
    variables: EmailTemplateVariables,
    options: {
        missing?: MissingVariableBehaviour;
    } = {},
): EmailDocument {
    const missing =
        options.missing ?? "preserve";

    return {
        ...document,
        settings: {
            ...document.settings,
        },
        blocks: document.blocks.map((block) =>
            resolveBlockVariables(
                block,
                variables,
                missing,
            ),
        ),
    };
}

export function extractEmailDocumentVariables(
    document: EmailDocument,
): string[] {
    const variables = new Set<string>();

    const addFrom = (value: string) => {
        for (
            const variable of
            extractTemplateVariables(value)
            ) {
            variables.add(variable);
        }
    };

    for (const block of document.blocks) {
        switch (block.type) {
            case "text":
            case "heading":
                addFrom(block.content);
                break;

            case "button":
                addFrom(block.text);
                addFrom(block.url);
                break;

            case "image":
                addFrom(block.src);
                addFrom(block.alt);
                break;

            case "divider":
            case "spacer":
                break;
        }
    }

    return Array.from(variables).sort();
}
