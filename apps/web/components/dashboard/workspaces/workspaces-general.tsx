import React from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import type { FieldConfig } from "@schema";
import { ThemeNameSchema } from "@schema/types/themes";
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import { ReusableForm } from "@/components/common/reusable-form";
import {
    fetchWorkspace,
    removeWorkspaceLogo,
    updateWorkspace,
    updateWorkspaceLogo,
} from "@/lib/actions/workspace";
import { getDictionary } from "@/lib/dictionaries";

async function WorkspacesGeneral() {
    await connection();

    const cookieStore = await cookies();

    const [dict, workspace] = await Promise.all([
        getDictionary(cookieStore.get("locale")?.value ?? "en"),
        fetchWorkspace(),
    ]);

    const theme = ThemeNameSchema.catch("indigo").parse(workspace.theme);

    const fields: FieldConfig[] = [
        {
            name: "name",
            label: dict.platform.workspaceName,
            wrapperClasses: "col-span-12",
            props: {
                defaultValue: workspace.name,
                required: true,
            },
        },
        {
            kind: "select",
            name: "theme",
            label: dict.platform.workspaceColor,
            wrapperClasses: "col-span-12",
            options: [
                { value: "brand", label: dict.platform.neutral },
                { value: "indigo", label: dict.platform.indigo },
                { value: "violet", label: dict.platform.violet },
                { value: "teal", label: dict.platform.teal },
            ],
            props: {
                defaultValue: theme,
            },
        },
    ];

    const logoFields: FieldConfig[] = [
        {
            name: "logo",
            wrapperClasses: "col-span-12",
            el: (
                <div className="space-y-4">
                    {workspace.logoKey && (
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-background p-2">
                            <img
                                src={`/api/workspaces/${encodeURIComponent(workspace.publicId)}/logo?v=${encodeURIComponent(workspace.logoKey.split("/").at(-1) ?? "")}`}
                                alt={`${workspace.name} ${dict.platform.workspaceLogo}`}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label
                            htmlFor="workspace-logo"
                            className="block text-sm font-medium"
                        >
                            {dict.platform.workspaceLogo}
                        </label>
                        <input
                            id="workspace-logo"
                            name="logo"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            required
                            className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:font-medium file:text-brand"
                        />
                        <p className="text-xs text-muted-foreground">
                            {dict.platform.workspaceLogoFormats}
                        </p>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <SectionCard
                title={dict.platform.workspaceDetails}
                description={dict.platform.workspaceDetailsDescription}
            >
                <ReusableForm
                    formKey={workspace.id}
                    fields={fields}
                    action={updateWorkspace}
                    notify={{
                        kind: "toast",
                        successMessage: dict.platform.workspaceUpdated,
                        errorMessage: dict.platform.errorUpdatingWorkspace,
                    }}
                    submitButtonProps={{
                        wrapperClasses: "flex items-center justify-end my-4 py-3",
                        submitLabel: dict.platform.save,
                    }}
                />
            </SectionCard>

            <SectionCard
                title={dict.platform.workspaceLogo}
                description={dict.platform.workspaceDetailsDescription}
            >
                <ReusableForm
                    formKey={`${workspace.id}:${workspace.logoKey ?? ""}`}
                    fields={logoFields}
                    action={updateWorkspaceLogo}
                    notify={{
                        kind: "toast",
                        successMessage: dict.platform.workspaceUpdated,
                        errorMessage: dict.platform.errorUpdatingWorkspace,
                    }}
                    submitButtonProps={{
                        wrapperClasses: "my-4 py-3",
                        submitLabel: dict.platform.uploadLogo,
                    }}
                />

                {workspace.logoKey && (
                    <ReusableForm
                        formKey={`remove:${workspace.id}:${workspace.logoKey}`}
                        fields={[]}
                        action={removeWorkspaceLogo}
                        notify={{
                            kind: "toast",
                            successMessage: dict.platform.workspaceLogoRemoved,
                            errorMessage: dict.platform.workspaceLogoRemoveError,
                        }}
                        submitButtonProps={{
                            wrapperClasses: "flex justify-end -mt-16",
                            submitLabel: dict.platform.removeLogo,
                            buttonProps: {
                                color: "red",
                                variant: "light",
                            },
                        }}
                    />
                )}
            </SectionCard>
        </div>
    );
}

export default WorkspacesGeneral;
