"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { Settings2 } from "lucide-react";
import React from "react";

import { ReusableForm } from "@/components/common/reusable-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { saveGoogleOAuthConfig } from "@/lib/actions/dashboard";

function GoogleOAuthConfigForm() {
	const dict = useOptionalDictionary();
	const fields = [
		{
			name: "clientId",
			label: (
				<code className="rounded bg-muted/50 px-2 py-1 text-xs">
					{dict?.platform?.googleClientId ?? "GOOGLE CLIENT ID"}
				</code>
			),
			required: true,
			props: {
				required: true,
				autoComplete: "off",
				placeholder: "xxxxx.apps.googleusercontent.com",
			},
		},
		{
			name: "clientSecret",
			label: (
				<code className="rounded bg-muted/50 px-2 py-1 text-xs">
					{dict?.platform?.googleClientSecret ?? "GOOGLE CLIENT SECRET"}
				</code>
			),
			required: true,
			props: {
				required: true,
				autoComplete: "off",
				type: "password",
			},
		},
	];

	return (
		<ReusableForm
			action={saveGoogleOAuthConfig}
			fields={fields}
			onSuccess={() => modals.closeAll()}
			submitButtonProps={{
				submitLabel:
					dict?.platform?.saveGoogleOAuthConfig ??
					"Save Google OAuth Configuration",
				wrapperClasses: "justify-center mt-6 flex",
				fullWidth: true,
			}}
		/>
	);
}

export default function GoogleOAuthConfigButton() {
	const dict = useOptionalDictionary();
	const openModal = () => {
		modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">
					{dict?.platform?.configureGoogleOAuth ?? "Configure Google OAuth"}
				</div>
			),
			size: "lg",
			closeOnEscape: false,
			closeOnClickOutside: false,
			children: (
				<div className="space-y-6 p-2">
					<div>
						<h3 className="text-base font-semibold">
							{dict?.platform?.googleOAuthApplication ??
								"Google OAuth application"}
						</h3>

						<p className="mt-1 text-sm text-muted-foreground">
							{dict?.platform?.enterGoogleOAuthCredentialsHelp ??
								"Enter the OAuth credentials from your Google Cloud project."}
						</p>
					</div>

					<GoogleOAuthConfigForm />
				</div>
			),
		});
	};

	return (
		<Button
			size="sm"
			variant="default"
			leftSection={<Settings2 className="h-4 w-4" />}
			onClick={openModal}
		>
			{dict?.platform?.configureGoogleOAuth ?? "Configure Google OAuth"}
		</Button>
	);
}
