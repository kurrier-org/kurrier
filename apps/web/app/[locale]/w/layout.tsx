import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/actions/auth";
import { withLocale } from "@/lib/utils";

export default async function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const user = await isSignedIn();

	if (!user) {
		const { locale } = await params;
		redirect(withLocale(locale, "/auth/login"));
	}

	return <>{children}</>;
}
