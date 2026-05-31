import React from 'react';
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import {ReusableForm} from "@/components/common/reusable-form";
import {fetchWorkspace, updateWorkspace} from "@/lib/actions/workspace";


async function WorkspacesGeneral() {

    const workspace = await fetchWorkspace()

    const fields = [
        {
            name: "name",
            label: "Workspace Name",
            wrapperClasses: "col-span-12",
            props: {
                defaultValue: workspace.name,
            }
        }
    ];

    return <>
        <SectionCard
            title="Workspace details"
            description="Update your workspace information."
        >

            <ReusableForm
                fields={fields}
                action={updateWorkspace}
                notify={{
                    kind: "toast",
                    successMessage: "Workspace updated.",
                    errorMessage: "Error updating workspace.",
                }}
                submitButtonProps={{
                    wrapperClasses: "flex items-center justify-end my-4 py-3",
                    submitLabel: "Save",
                }}
            />

        </SectionCard>

    </>
}

export default WorkspacesGeneral;
