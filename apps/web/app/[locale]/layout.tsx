import { DictionaryProvider } from "@/components/providers/dictionary-provider";
import { getDictionary } from "@/lib/dictionaries";

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;
	const dict = await getDictionary(locale);

	return <DictionaryProvider dict={dict}>{children}</DictionaryProvider>;
}
