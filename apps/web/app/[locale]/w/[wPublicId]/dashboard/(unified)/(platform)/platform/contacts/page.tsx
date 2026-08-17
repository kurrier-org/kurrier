import React from "react";
import { getDictionary } from "@/lib/dictionaries";

async function Page({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const dict = await getDictionary(locale);
	return <>{dict.platform.contacts}</>;
}

export default Page;
