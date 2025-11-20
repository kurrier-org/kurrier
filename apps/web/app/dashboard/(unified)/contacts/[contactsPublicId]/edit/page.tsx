import React from "react";
import NewContactForm from "@/components/dashboard/contacts/new-contact-form";
import { isSignedIn } from "@/lib/actions/auth";
import { FormState, getPublicEnv, handleAction } from "@schema";
import { decode } from "decode-formdata";
import { ContactCreate, ContactInsertSchema, contacts } from "@db";
import { rlsClient } from "@/lib/actions/clients";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";

async function Page({ params }: { params: { contactsPublicId: string } }) {
	const { contactsPublicId } = await params;

	const rls = await rlsClient();
	const [contact] = await rls((tx) =>
		tx.select().from(contacts).where(eq(contacts.publicId, contactsPublicId)),
	);

	if (!contact) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-4 text-sm text-muted-foreground">
				<p>No contact found.</p>
			</div>
		);
	}

	const supabase = await createClient();
	const { data } = await supabase.storage
		.from("attachments")
		.createSignedUrl(String(contact.profilePicture), 600);
	const profilePictureUrl = data?.signedUrl || null;

	const user = await isSignedIn();
	const publicConfig = getPublicEnv();
	const updateContactAction = async (_prev: FormState, formData: FormData) => {
		"use server";

		return handleAction(async () => {
			const decoded = decode(formData);
			const parsed = ContactInsertSchema.safeParse(decoded);
			if (!parsed.success) {
				return { success: false, error: parsed.error.message };
			}
			const { publicId, ownerId, createdAt, ...updateValues } =
				parsed.data as ContactCreate;

			updateValues.updatedAt = new Date();

			const rls = await rlsClient();
			const [updatedContact] = await rls((tx) =>
				tx
					.update(contacts)
					.set(updateValues)
					.where(eq(contacts.publicId, contactsPublicId))
					.returning(),
			);

			revalidatePath(`/dashboard/contacts/${contactsPublicId}`);
			revalidatePath("/dashboard/contacts");

			return { success: true, data: updatedContact };
		});
	};

	return (
		<NewContactForm
			contact={contact}
			profilePictureUrl={profilePictureUrl}
			createContactAction={updateContactAction}
			user={user}
			publicConfig={publicConfig}
		/>
	);
}

export default Page;
