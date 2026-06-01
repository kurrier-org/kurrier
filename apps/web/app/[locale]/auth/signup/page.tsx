import { SignupForm } from "@/components/auth/signup-form";
import KurrierLogo from "@/components/common/kurrier-logo";
import Link from "next/link";
import * as React from "react";
import { getPublicEnv } from "@schema";
import { redirect } from "next/navigation";
import {getDictionary, Locale} from "@/lib/dictionaries";


export default async function SignupPage({ params }: { params: Promise<{ locale: Locale }>; }) {
	const { DISABLE_SIGNUP } = getPublicEnv();
	const googleEnabled = process.env.OIDC_GOOGLE_CLIENT_ID && process.env.OIDC_GOOGLE_CLIENT_SECRET;

	if (DISABLE_SIGNUP) {
		redirect("/auth/login?message=signup_disabled");
	}

	const nParams = await params;
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
				<SignupForm oidc={{
					googleEnabled: !!googleEnabled,
				}} dict={dict} />
			</div>
		</div>
	);
}
