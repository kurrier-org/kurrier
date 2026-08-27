"use client";

import React from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { createProviderIdentity } from "@/lib/actions/dashboard";

function NewMailtrapIdentityForm({
	onCompleted,
}: {
	onCompleted?: () => void;
}) {
	const fields = [
		{
			el: <input type="hidden" name="providerType" value="mailtrap" />,
		},
		{
			name: "value",
			label: (
				<code className="rounded bg-muted/50 px-2 py-1 text-xs">
					Email Address
				</code>
			),
			required: true,
			wrapperClasses: "col-span-12",
			props: {
				type: "email",
				autoComplete: "off",
				required: true,
				placeholder: "e.g. support@example.com",
			},
			bottomStartPrefix: (
				<span className="text-xs text-muted-foreground">
					The address that routes into your Mailtrap inbox.
				</span>
			),
		},
	];

	return (
		<ReusableForm
			action={createProviderIdentity}
			onSuccess={onCompleted}
			fields={fields}
			submitButtonProps={{
				submitLabel: "Add Identity",
				wrapperClasses: "justify-center mt-6 flex",
				fullWidth: true,
			}}
		/>
	);
}

export default NewMailtrapIdentityForm;
