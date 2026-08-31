import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isSignedIn } from "@/lib/actions/auth";
import { withLocale } from "@/lib/utils";
import {DISTRIBUTION_CONFIG} from "@distribution/config";

async function AuthenticatedDashboard({
										  children,
										  locale,
									  }: {
	children: React.ReactNode;
	locale: string;
}) {
	await connection();

	const user = await isSignedIn();

	if (!user) {
		redirect(withLocale(locale, "/auth/login"));
	}

	return <>{children}</>;
}

export default async function DashboardLayout({
												  children,
												  params,
											  }: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	return (
		<Suspense fallback={null}>
			<AuthenticatedDashboard locale={locale}>
				{children}
			</AuthenticatedDashboard>
		</Suspense>
	);
}

export function generateStaticParams() {
	return DISTRIBUTION_CONFIG.locales.map((locale) => ({
		locale,
	}));
}
