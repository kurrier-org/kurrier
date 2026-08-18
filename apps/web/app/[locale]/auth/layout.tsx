import { getWorkspaceRedirectUrl, isSignedIn } from "@/lib/actions/auth";
import { withLocale } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const user = await isSignedIn();

	if (user) {
		redirect(withLocale(locale, await getWorkspaceRedirectUrl(user, undefined, true)));
	}

	return <>{children}</>;
}
