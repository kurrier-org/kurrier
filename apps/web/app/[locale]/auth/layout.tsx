import { isSignedIn } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await isSignedIn();

	if (user) {
		redirect("/dashboard/platform/overview");
	}

	return <>{children}</>;
}
