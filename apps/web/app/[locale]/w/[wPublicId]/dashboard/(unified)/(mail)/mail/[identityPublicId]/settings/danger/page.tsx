import { Button } from "@mantine/core";
import { Trash2 } from "lucide-react";
import React from "react";
import SectionCard from "@/components/mailbox/settings/settings-section-card";
import { getDictionary, type Locale } from "@/lib/dictionaries";

async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
	const { locale } = await params;
	const dict = await getDictionary(locale);

	return (
		<>
			<SectionCard
				title={dict.mailbox.dangerZoneTitle}
				description={dict.mailbox.dangerZoneDescription}
				footer={
					<div className="flex items-center justify-end">
						<Button color="red" leftSection={<Trash2 size={16} />}>
							{dict.mailbox.deleteIdentity}
						</Button>
					</div>
				}
			>
				<div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
					{dict.mailbox.deletingIdentityWarning}
				</div>
			</SectionCard>
		</>
	);
}

export default Page;
