import { cookies } from "next/headers";
import { getDictionary } from "@/lib/dictionaries";

export default async function Page() {
	const cookieStore = await cookies();
	const dict = await getDictionary(cookieStore.get("locale")?.value ?? "en");

	return (
		<div className={"flex items-center justify-center my-24 text-sm"}>
			{dict.contacts.pleaseSelectAContact}
		</div>
	);
}
