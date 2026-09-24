import { Suspense } from "react";
import { identities } from "@db";
import { type FormState, handleAction } from "@schema";
import { decode } from "decode-formdata";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { rlsClient } from "@/lib/actions/clients";
import SettingsGeneral from "@/components/mailbox/settings/settings-general";

type PageProps = {
	params: Promise<Record<string, string>>;
};

function SettingsGeneralLoading() {
	return (
		<div className="animate-pulse rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
			<div className="h-5 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />

			<div className="mt-2 h-4 w-72 rounded bg-neutral-100 dark:bg-neutral-800/70" />

			<div className="mt-8 grid gap-5 sm:grid-cols-2">
				<div className="space-y-2">
					<div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
					<div className="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800/70" />
				</div>

				<div className="space-y-2">
					<div className="h-4 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
					<div className="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800/70" />
				</div>
			</div>

			<div className="mt-6 flex justify-end">
				<div className="h-10 w-28 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
			</div>
		</div>
	);
}

async function SettingsGeneralContent({ params }: PageProps) {
	const paramsResolved = await params;

	const rls = await rlsClient();

	const [identity] = await rls((tx) =>
		tx
			.select()
			.from(identities)
			.where(eq(identities.publicId, paramsResolved.identityPublicId))
			.limit(1)
	);

	const updateName = async (
		_prev: FormState,
		formData: FormData
	): Promise<FormState> => {
		"use server";

		return handleAction(async () => {
			const decodedForm = decode(formData);

			const rls = await rlsClient();

			await rls((tx) =>
				tx
					.update(identities)
					.set({
						displayName: decodedForm.displayName as string,
						updatedAt: new Date(),
					})
					.where(eq(identities.id, decodedForm.id as string))
			);

			revalidatePath(String(decodedForm.pathname));

			return {
				success: true,
				message: "mailbox.displayNameUpdated",
			};
		});
	};

	return <SettingsGeneral updateName={updateName} identity={identity} />;
}

export default function Page(props: PageProps) {
	return (
		<Suspense fallback={<SettingsGeneralLoading />}>
			<SettingsGeneralContent {...props} />
		</Suspense>
	);
}
