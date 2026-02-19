import { SignupForm } from "@/components/auth/signup-form";
import KurrierLogo from "@/components/common/kurrier-logo";
import Link from "next/link";
import * as React from "react";
import { getPublicEnv } from "@schema";
import { redirect } from "next/navigation";

export default function SignupPage() {
	const { DISABLE_SIGNUP } = getPublicEnv();

	if (DISABLE_SIGNUP) {
		redirect("/auth/login?message=signup_disabled");
	}

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
				<SignupForm />
			</div>
		</div>
	);
}
