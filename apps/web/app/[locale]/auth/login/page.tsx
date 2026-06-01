import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import KurrierLogo from "@/components/common/kurrier-logo";
import * as React from "react";
import {getDictionary, Locale} from "@/lib/dictionaries";

export default async function LoginPage({ params, searchParams }: {
		params: Promise<{ locale: Locale }>;
		searchParams: Promise<{ message?: string }>;
	}) {
	const sParams = await searchParams;
	const nParams = await params;
	const dict = await getDictionary(nParams.locale);
	const showSignupDisabledMessage = sParams.message === "signup_disabled";
	const googleEnabled = process.env.OIDC_GOOGLE_CLIENT_ID && process.env.OIDC_GOOGLE_CLIENT_SECRET;

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
				{showSignupDisabledMessage && (
					<div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
						<p className="text-sm text-yellow-800">
							User registration is currently disabled. Please contact your
							administrator for access.
						</p>
					</div>
				)}
				<LoginForm dict={dict} oidc={{
					googleEnabled: !!googleEnabled,
				}} />
			</div>
		</div>
	);
}
