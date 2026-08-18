import React from "react";
import { getDictionary, type Locale } from "@/lib/dictionaries";

async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
	const { locale } = await params;
	const dict = await getDictionary(locale);

	return (
		<>
			<div
				className={
					"flex flex-1 flex-col items-center justify-center p-4 text-center"
				}
			>
				{dict.mailbox.selectMailboxPrompt}
			</div>
		</>
	);
}

export default Page;
