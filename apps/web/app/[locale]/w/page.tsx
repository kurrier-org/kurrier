import { redirect } from "next/navigation";
import { getDefaultWorkspacePath, isSignedIn } from "@/lib/actions/auth";
import { withLocale } from "@/lib/utils";

export default async function WorkspaceIndexPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const user = await isSignedIn();

	if (!user) {
		redirect(withLocale(locale, "/auth/login"));
	}

	const target = await getDefaultWorkspacePath(user as any);
	redirect(withLocale(locale, target));
}
