import { identities } from "@db";
import { Divider } from "@mantine/core";
import { eq } from "drizzle-orm";
import React from "react";
import CreateMailRuleForm from "@/components/mailbox/settings/rules/create-rule-form";
import MailRulesList from "@/components/mailbox/settings/rules/mail-rules-list";
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import { rlsClient } from "@/lib/actions/clients";
import {
	createRule,
	fetchMailRules,
	getAppLabels,
} from "@/lib/actions/mail-rules";
import { getDictionary, type Locale } from "@/lib/dictionaries";

async function Page({
	params,
}: {
	params: { identityPublicId: string; locale: Locale };
}) {
	const resolvedParams = await params;
	const dict = await getDictionary(resolvedParams.locale);
	const rls = await rlsClient();

	const [identity] = await rls((tx) =>
		tx
			.select()
			.from(identities)
			.where(eq(identities.publicId, resolvedParams.identityPublicId)),
	);

	if (!identity) {
		return (
			<SectionCard
				title={dict.mailbox.rules}
				description={dict.mailbox.rulesDescription}
			>
				<div className="text-sm text-neutral-600 dark:text-neutral-400">
					{dict.mailbox.identityNotFound}
				</div>
			</SectionCard>
		);
	}

	const appLabels = await getAppLabels();
	const rules = await fetchMailRules(identity.id);

	return (
		<SectionCard
			title={dict.mailbox.rules}
			description={dict.mailbox.rulesDescription}
		>
			<MailRulesList rules={rules} />
			{rules.length > 0 && (
				<Divider
					my={"xl"}
					variant={"dashed"}
					label={<span className={"text-sm"}>{dict.mailbox.addNewLabel}</span>}
					labelPosition={"left"}
				/>
			)}
			<CreateMailRuleForm
				identityId={identity.id}
				action={createRule}
				appLabels={appLabels}
			/>
		</SectionCard>
	);
}

export default Page;
