import React from "react";
import NewContactForm from "@/components/dashboard/contacts/new-contact-form";
import { decode } from "decode-formdata";
import { FormState, getPublicEnv, handleAction } from "@schema";
import { rlsClient } from "@/lib/actions/clients";
import { ContactCreate, ContactInsertSchema, contacts } from "@db";
import { isSignedIn } from "@/lib/actions/auth";
import { revalidatePath } from "next/cache";

async function Page() {
	const user = await isSignedIn();
	const publicConfig = getPublicEnv();
	const createContactAction = async (_prev: FormState, formData: FormData) => {
		"use server";
		return handleAction(async () => {
			const data = decode(formData);
			const res = ContactInsertSchema.safeParse(data);
			if (res.error) {
				return { success: false, error: res.error.message };
			}
			const rls = await rlsClient();
			const [newContact] = await rls((tx) =>
				tx
					.insert(contacts)
					.values(res.data as ContactCreate)
					.returning(),
			);
			revalidatePath("/dashboard/contacts/new");
			return { success: true, data: newContact };
		});
	};

	return (
		<NewContactForm
			createContactAction={createContactAction}
			user={user}
			publicConfig={publicConfig}
		/>
	);
}

export default Page;
