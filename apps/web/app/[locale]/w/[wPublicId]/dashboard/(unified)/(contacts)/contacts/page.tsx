import { cookies } from "next/headers";
import ContactSelectionPlaceholder from "@/components/dashboard/contacts/contact-selection-placeholder";
import { getDictionary } from "@/lib/dictionaries";

export default async function Page() {
	const cookieStore = await cookies();
	const dict = await getDictionary(cookieStore.get("locale")?.value ?? "en");

	return (
		<ContactSelectionPlaceholder
			title={dict.contacts.selectContactTitle}
			description={dict.contacts.pleaseSelectAContact}
		/>
	);
}
