import React, { Suspense } from "react";
import { identities } from "@db";
import { eq } from "drizzle-orm";

import SectionCard from "@/components/mailbox/settings/settings-section-card";
import { rlsClient } from "@/lib/actions/clients";
import { listEmailSignatures } from "@/lib/actions/email-signatures";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import EmailSignaturesManager from "@/components/mailbox/signatures/email-signatures-manager";

type PageProps = {
	params: Promise<{
		identityPublicId: string;
		locale: Locale;
	}>;
};

type SignatureDictionary = {
	signatures?: string;
	signaturesDescription?: string;
};

function SignaturesFallback() {
	return (
		<SectionCard
			title="Signatures"
			description="Manage signatures for this identity."
		>
			<div className="animate-pulse space-y-5">
				<div className="grid gap-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
					<div className="flex gap-3">
						<div className="h-10 flex-1 rounded-md bg-neutral-100 dark:bg-neutral-800" />
						<div className="h-10 w-20 rounded-md bg-neutral-100 dark:bg-neutral-800" />
						<div className="h-10 flex-1 rounded-md bg-neutral-100 dark:bg-neutral-800" />
						<div className="h-10 w-32 rounded-md bg-neutral-100 dark:bg-neutral-800" />
					</div>

					<div className="h-6 w-72 rounded-md bg-neutral-100 dark:bg-neutral-800" />
				</div>

				<div className="h-[500px] rounded-xl bg-neutral-100 dark:bg-neutral-800" />
			</div>
		</SectionCard>
	);
}

async function SignaturesContent({ params }: PageProps) {
	const resolvedParams = await params;

	const [dict, rls] = await Promise.all([
		getDictionary(resolvedParams.locale),
		rlsClient(),
	]);

	const mailboxDictionary = dict.mailbox as typeof dict.mailbox & SignatureDictionary;

	const [identity] = await rls((tx) =>
		tx
			.select({
				id: identities.id,
				publicId: identities.publicId,
			})
			.from(identities)
			.where(eq(identities.publicId, resolvedParams.identityPublicId))
			.limit(1)
	);

	if (!identity) {
		return (
			<SectionCard
				title={mailboxDictionary.signatures ?? "Signatures"}
				description={
					mailboxDictionary.signaturesDescription ??
					"Manage signatures for this identity."
				}
			>
				<div className="text-sm text-neutral-600 dark:text-neutral-400">
					{dict.mailbox.identityNotFound}
				</div>
			</SectionCard>
		);
	}

	const signatures = await listEmailSignatures(identity.publicId);

	return (
		<SectionCard
			title={mailboxDictionary.signatures ?? "Signatures"}
			description={
				mailboxDictionary.signaturesDescription ??
				"Create signatures and choose which ones are used for new messages, replies and forwards."
			}
		>
			<EmailSignaturesManager
				identityPublicId={identity.publicId}
				initialSignatures={signatures}
			/>
		</SectionCard>
	);
}

export default function Page(props: PageProps) {
	return (
		<Suspense fallback={<SignaturesFallback />}>
			<SignaturesContent {...props} />
		</Suspense>
	);
}
