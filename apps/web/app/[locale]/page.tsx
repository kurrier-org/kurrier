import { DISTRIBUTION_PAGES } from "@distribution/pages";

export default async function LocaleRootPage({ params }: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	return (
		<DISTRIBUTION_PAGES.LandingPage locale={locale}/>
	);
}
