import React from "react";
import { ProviderSpec } from "@schema";
import { ulid } from "ulid";
import { ReusableForm } from "@/components/common/reusable-form";
import {
	FetchDecryptedSecretsResult,
	upsertProviderAccount,
} from "@/lib/actions/dashboard";
import { parseSecret } from "@/lib/utils";
import { VerifyResult } from "@providers";

function ProviderEditForm({
	spec,
	onCompleted,
	providerId,
	decryptedSecret,
}: {
	spec: ProviderSpec;
	onCompleted?: (res: VerifyResult) => void;
	providerId: string;
	decryptedSecret: FetchDecryptedSecretsResult[number];
}) {
	const decryptedValues = parseSecret(decryptedSecret);

	const fields = [
		{
			name: "ulid",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: ulid() },
		},
		{
			name: "providerId",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: providerId },
		},
		...spec.requiredEnv.map((row: string) => ({
			name: `required.${row}`,
			label: (
				<code className="rounded bg-muted/50 px-2 py-1 text-xs">{row}</code>
			),
			required: true,
			wrapperClasses: "col-span-12",
			props: {
				autoComplete: "off",
				required: true,
				defaultValue: decryptedValues ? (decryptedValues[row] ?? "") : "",
			},
		})),
	];

	return (
		<ReusableForm
			fields={fields}
			onSuccess={onCompleted}
			action={upsertProviderAccount}
		/>
	);
}

export default ProviderEditForm;
