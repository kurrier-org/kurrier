import { SignupForm } from "@/components/auth/signup-form";
import KurrierLogo from "@/components/common/kurrier-logo";
import Link from "next/link";
import * as React from "react";
import { getPublicEnv } from "@schema";
import { redirect } from "next/navigation";
import {getDictionary, Locale} from "@/lib/dictionaries";
import { getGenericOidcSettings } from "@/lib/generic-oidc";
import { LanguageSwitcher } from "@/components/common/language-switcher";

export default async function SignupPage({ params }: { params: Promise<{ locale: Locale }>; }) {
	const { DISABLE_SIGNUP } = getPublicEnv();
	const googleEnabled = process.env.OIDC_GOOGLE_CLIENT_ID && process.env.OIDC_GOOGLE_CLIENT_SECRET;
	const genericOidc = getGenericOidcSettings();

	if (DISABLE_SIGNUP) {
		redirect("/auth/login?message=signup_disabled");
	}

	const nParams = await params;
	const dict = await getDictionary(nParams.locale);

	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<div className="flex items-center justify-between">
					<Link
						href="/"
						className="flex items-center gap-2 font-medium"
					>
						<KurrierLogo size={56} />
						<span className="truncate font-medium text-4xl">Kurrier</span>
					</Link>
					<LanguageSwitcher />
				</div>
				<SignupForm oidc={{
					googleEnabled: !!googleEnabled,
					genericEnabled: !!genericOidc,
					genericName: genericOidc?.providerName,
				}} dict={dict}  />
			</div>
		</div>
	);
}
