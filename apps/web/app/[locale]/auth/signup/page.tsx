import { getPublicEnv } from "@schema";
import Link from "next/link";
import { redirect } from "next/navigation";
import * as React from "react";
import { SignupForm } from "@/components/auth/signup-form";
import KurrierLogo from "@/components/common/kurrier-logo";
import { getDictionary, type Locale } from "@/lib/dictionaries";
import { getGenericOidcSettings } from "@/lib/generic-oidc";
import { withLocale } from "@/lib/utils";

export default async function SignupPage({
	params,
}: {
	params: Promise<{ locale: Locale }>;
}) {
	const { DISABLE_SIGNUP } = getPublicEnv();
	const googleEnabled =
		process.env.OIDC_GOOGLE_CLIENT_ID && process.env.OIDC_GOOGLE_CLIENT_SECRET;
	const genericOidc = getGenericOidcSettings();
	const nParams = await params;

	if (DISABLE_SIGNUP) {
		redirect(withLocale(nParams.locale, "/auth/login?message=signup_disabled"));
	}

	const dict = await getDictionary(nParams.locale);

	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<Link
					href="/"
					className="flex items-center gap-2 self-center font-medium"
				>
					<KurrierLogo size={56} />
					<span className="truncate font-medium text-4xl">Kurrier</span>
				</Link>
				<SignupForm
					oidc={{
						googleEnabled: !!googleEnabled,
						genericEnabled: !!genericOidc,
						genericName: genericOidc?.providerName,
					}}
					dict={dict}
				/>
			</div>
		</div>
	);
}
