import { redirect } from "next/navigation";
import { getDefaultWorkspacePath, isSignedIn } from "@/lib/actions/auth";
import { withLocale } from "@/lib/utils";

export default async function DashboardLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const user = await isSignedIn();

	if (user) {
		const { locale } = await params;
		const target = await getDefaultWorkspacePath(user as any);
		redirect(withLocale(locale, target));
	}

	return <>{children}</>;
}
