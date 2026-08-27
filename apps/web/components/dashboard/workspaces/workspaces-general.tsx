import React from "react";
import { connection } from "next/server";
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import { ReusableForm } from "@/components/common/reusable-form";
import {
    fetchWorkspace,
    updateWorkspace,
} from "@/lib/actions/workspace";
import { getDictionary } from "@/lib/dictionaries";
import { cookies } from "next/headers";

async function WorkspacesGeneral() {
    await connection();

    const cookieStore = await cookies();

    const [dict, workspace] = await Promise.all([
        getDictionary(cookieStore.get("locale")?.value ?? "en"),
        fetchWorkspace(),
    ]);

    const fields = [
        {
            name: "name",
            label: dict.platform.workspaceName,
            wrapperClasses: "col-span-12",
            props: {
                defaultValue: workspace.name,
            },
        },
    ];

    return (
        <SectionCard
            title={dict.platform.workspaceDetails}
            description={dict.platform.workspaceDetailsDescription}
        >
            <ReusableForm
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
    );
}

export default WorkspacesGeneral;
