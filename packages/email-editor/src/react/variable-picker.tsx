"use client";

import type {
    Editor,
} from "@tiptap/react";

import type {
    EmailEditorVariable,
} from "../types";

type VariablePickerProps = {
    editor: Editor | null;
    variables: EmailEditorVariable[];
};

export function VariablePicker({
                                   editor,
                                   variables,
                               }: VariablePickerProps) {
    if (variables.length === 0) {
        return null;
    }

    return (
        <select
            aria-label="Insert variable"
            className="h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
            value=""
            disabled={!editor}
            onChange={(event) => {
                const key =
                    event.currentTarget.value;

                if (!key || !editor) {
                    return;
                }

                editor
                    .chain()
                    .focus()
                    .insertContent(
                        `{{${key}}}`,
                    )
                    .run();
            }}
        >
            <option value="">
                Insert variable
            </option>

            {variables.map((variable) => (
                <option
                    key={variable.key}
                    value={variable.key}
                >
                    {variable.label ??
                        variable.key}
                </option>
            ))}
        </select>
    );
}
