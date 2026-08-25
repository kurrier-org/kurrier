import { cookies } from "next/headers";
import React from "react";
import { getDictionary } from "@/lib/dictionaries";

async function Page() {
	const cookieStore = await cookies();
	const dict = await getDictionary(cookieStore.get("locale")?.value ?? "en");
	return (
		<div className={"flex items-center justify-center my-24 text-sm"}>
			{dict.contacts.pleaseSelectAContact}
		</div>
	);
}

export default Page;
