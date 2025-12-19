"use client";
import React from "react";
import Link from "next/link";
import { ContactEntity } from "@db";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import ContactListAvatar from "@/components/dashboard/contacts/contact-list-avatar";

export type ContactWithFavorite = ContactEntity & {
	isFavorite: boolean;
	labels?: string[];
};

function ContactsList({
	userContacts,
	profileImages,
}: {
	userContacts?: ContactWithFavorite[];
	profileImages:
		| {
				error: string | null;
				path: string | null;
				signedUrl: string;
		  }[]
		| null;
}) {
	const params = useParams() as {
		contactsPublicId?: string;
		labelSlug?: string;
	};

	const filteredUserContacts =
		params.labelSlug && userContacts
			? userContacts.filter((c) =>
					c.labels?.includes(params.labelSlug as string),
				)
			: (userContacts ?? []);

	return (
		<div className="overflow-y-auto flex-col h-[calc(100vh-10rem)]">
			{filteredUserContacts.map((c) => {
				const imagePath =
					c.profilePictureXs && profileImages
						? (profileImages.find((img) =>
								img.path?.includes(c.profilePictureXs as string),
							)?.signedUrl ?? null)
						: null;

				return (
					<Link
						key={c.id}
						className={[
							"flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-background",
							c.publicId === params.contactsPublicId
								? "text-brand dark:text-white bg-brand-100 dark:bg-neutral-800 hover:text-brand hover:bg-brand-100"
								: "",
						].join(" ")}
						href={
							params.labelSlug
								? `/dashboard/contacts/label/${params.labelSlug}/contact/${c.publicId}`
								: `/dashboard/contacts/${c.publicId}`
						}
					>

                        <ContactListAvatar signedUrl={imagePath} alt={c?.firstName} />

						<div className="min-w-0 flex-1">
							<div className="truncate text-sm font-medium text-foreground flex justify-between">
								{c.firstName} {c.lastName}
								<Star
									size={10}
									className={
										c.isFavorite
											? "text-yellow-400 fill-yellow-400"
											: "text-muted-foreground"
									}
								/>
							</div>
							<p className="truncate text-xs text-muted-foreground">
								{c.emails && c.emails.length > 0 ? c.emails[0].address : ""}
							</p>
						</div>
					</Link>
				);
			})}
		</div>
	);
}

export default ContactsList;
