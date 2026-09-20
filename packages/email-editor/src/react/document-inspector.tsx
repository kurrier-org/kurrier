"use client";

import type {
    EmailDocumentSettings,
} from "../types";

type DocumentInspectorProps = {
    settings: EmailDocumentSettings;
    onChange: (
        settings: EmailDocumentSettings,
    ) => void;
};

const inputClass =
    "h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500";

const labelClass = "grid gap-1.5 text-sm";

export function DocumentInspector({
                                      settings,
                                      onChange,
                                  }: DocumentInspectorProps) {
    const update = (
        changes: Partial<EmailDocumentSettings>,
    ) => {
        onChange({
            ...settings,
            ...changes,
        });
    };

    return (
        <aside className="h-full overflow-y-auto border-l bg-background">
            <div className="border-b p-4">
                <p className="text-sm font-semibold">
                    Email settings
                </p>
            </div>

            <div className="grid gap-5 p-4">
                <label className={labelClass}>
                    <span>Content width</span>

                    <input
                        type="number"
                        min={320}
                        max={900}
                        className={inputClass}
                        value={settings.contentWidth}
                        onChange={(event) => {
                            const contentWidth =
                                event.currentTarget.valueAsNumber;

                            if (!Number.isNaN(contentWidth)) {
                                update({ contentWidth });
                            }
                        }}
                    />
                </label>

                <ColorField
                    label="Email background"
                    value={settings.backgroundColor}
                    onChange={(backgroundColor) =>
                        update({ backgroundColor })
                    }
                />

                <ColorField
                    label="Content background"
                    value={
                        settings.contentBackgroundColor
                    }
                    onChange={(
                        contentBackgroundColor,
                    ) =>
                        update({
                            contentBackgroundColor,
                        })
                    }
                />

                <ColorField
                    label="Default text colour"
                    value={settings.textColor}
                    onChange={(textColor) =>
                        update({ textColor })
                    }
                />

                <label className={labelClass}>
                    <span>Font family</span>

                    <select
                        className={inputClass}
                        value={settings.fontFamily}
                        onChange={(event) =>
                            update({
                                fontFamily:
                                event.currentTarget.value,
                            })
                        }
                    >
                        <option value="Arial, sans-serif">
                            Arial
                        </option>

                        <option value="Helvetica, Arial, sans-serif">
                            Helvetica
                        </option>

                        <option value="Georgia, serif">
                            Georgia
                        </option>

                        <option value="'Times New Roman', serif">
                            Times New Roman
                        </option>

                        <option value="Verdana, sans-serif">
                            Verdana
                        </option>

                        <option value="Tahoma, sans-serif">
                            Tahoma
                        </option>

                        <option value="'Trebuchet MS', sans-serif">
                            Trebuchet MS
                        </option>
                    </select>
                </label>
            </div>
        </aside>
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
                        onChange(event.currentTarget.value)
                    }
                />

                <input
                    type="text"
                    className={inputClass}
                    value={value}
                    onChange={(event) =>
                        onChange(event.currentTarget.value)
                    }
                />
            </div>
        </label>
    );
}
