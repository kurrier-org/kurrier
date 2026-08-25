import { redirect } from "next/navigation";
import { withLocale } from "@/lib/utils";

export default async function DashboardIndexPage({
	params,
}: {
	params: Promise<{ locale: string; wPublicId: string }>;
}) {
	const { locale, wPublicId } = await params;
	redirect(withLocale(locale, `/w/${wPublicId}/dashboard/platform/overview`));
}
