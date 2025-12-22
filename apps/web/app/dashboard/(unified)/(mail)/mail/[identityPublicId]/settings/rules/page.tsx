import React from "react";
import { eq, ne } from "drizzle-orm";
import { identities, labels } from "@db";
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import CreateMailRuleForm from "@/components/mailbox/settings/rules/create-rule-form";
import { createRule, fetchMailRules } from "@/lib/actions/mail-rules";
import { rlsClient } from "@/lib/actions/clients";
import MailRulesList from "@/components/mailbox/settings/rules/mail-rules-list";
import { Divider } from "@mantine/core";

async function Page({ params }: { params: { identityPublicId: string } }) {

    const resolvedParams = await params;
    const rls = await rlsClient();

    const [identity] = await rls((tx) =>
        tx
            .select()
            .from(identities)
            .where(eq(identities.publicId, resolvedParams.identityPublicId)),
    );

    const appLabels = await rls((tx) =>
        tx.select().from(labels).where(ne(labels.isSystem, true))
    );


    if (!identity) {
        return (
            <SectionCard title="Rules" description="Create filters to automatically process incoming mail.">
                <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Identity not found.
                </div>
            </SectionCard>
        );
    }

    const rules = await fetchMailRules(identity.id);

    return (
        <SectionCard
            title={"Rules"}
            description={"Create filters to automatically process incoming mail."}
        >
            <MailRulesList rules={rules} />
            {rules.length > 0 && <Divider my={"xl"} variant={"dashed"} label={<span className={"text-sm"}>Add New Label</span>} labelPosition={"left"} />}
            <CreateMailRuleForm identityId={identity.id} action={createRule} appLabels={appLabels} />

        </SectionCard>
    );
}

export default Page;
