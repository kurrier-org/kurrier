import React from 'react';
import {Button} from "@mantine/core";
import {Trash2} from "lucide-react";
import SectionCard from "@/components/mailbox/settings/settings-section-card";

function Page() {
    return <>
        <SectionCard
            title="Danger zone"
            description="Be careful — these actions can’t be undone."
            footer={
                <div className="flex items-center justify-end">
                    <Button color="red" leftSection={<Trash2 size={16} />}>
                        Delete identity
                    </Button>
                </div>
            }
        >
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                Deleting an identity will remove its mailboxes, rules, and related
                data.
            </div>
        </SectionCard>
    </>
}

export default Page;
