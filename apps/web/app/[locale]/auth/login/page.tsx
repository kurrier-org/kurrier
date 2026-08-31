import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import KurrierLogo from "@/components/common/kurrier-logo";
import * as React from "react";
import { getDictionary, Locale } from "@/lib/dictionaries";
import { getGenericOidcSettings } from "@/lib/generic-oidc";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import Loading from "@/app/loading";
import {DISTRIBUTION_CONFIG} from "@distribution/config";

type LoginPageProps = {
	params: Promise<{ locale: Locale }>;
	searchParams: Promise<{ message?: string }>;
};

async function LoginContent({
								params,
								searchParams,
							}: LoginPageProps) {
	const [sParams, nParams] = await Promise.all([
		searchParams,
		params,
	]);

	const dict = await getDictionary(nParams.locale);

	const showSignupDisabledMessage =
		sParams.message === "signup_disabled";

	const googleEnabled =
		process.env.OIDC_GOOGLE_CLIENT_ID &&
		process.env.OIDC_GOOGLE_CLIENT_SECRET;

	const genericOidc = getGenericOidcSettings();

	return (
		<div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<div className="flex items-center justify-between">
					<Link
						href="/"
						className="flex items-center gap-2 font-medium"
					>
						<KurrierLogo size={56} />
						<span className="truncate font-medium text-4xl">
							Kurrier
						</span>
					</Link>

					<LanguageSwitcher />
				</div>

				{showSignupDisabledMessage && (
					<div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
						<p className="text-sm text-yellow-800">
							User registration is currently disabled. Please contact your
							administrator for access.
						</p>
					</div>
				)}

				<LoginForm
					dict={dict}
					oidc={{
						googleEnabled: !!googleEnabled,
						genericEnabled: !!genericOidc,
						genericName: genericOidc?.providerName,
					}}
				/>
			</div>
		</div>
	);
}

export default function LoginPage(props: LoginPageProps) {
	return (
		<Suspense fallback={<Loading />}>
			<LoginContent {...props} />
		</Suspense>
	);
}

export function generateStaticParams() {
	return DISTRIBUTION_CONFIG.locales.map((locale) => ({
		locale,
	}));
}
