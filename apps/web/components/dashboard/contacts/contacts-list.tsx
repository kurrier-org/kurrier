"use client";
import type { ContactEntity } from "@db";
import { Star } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ContactListAvatar from "@/components/dashboard/contacts/contact-list-avatar";
import ContactsEmptyState from "@/components/dashboard/contacts/contacts-empty-state";
import type { ProfileImage } from "@/components/dashboard/contacts/contacts-shell";

export type ContactWithFavorite = ContactEntity & {
	isFavorite: boolean;
	labels?: string[];
};

function ContactsList({
	userContacts,
	profileImages,
	workspacePublicId,
	selectedAddressBook,
}: {
	selectedAddressBook: string;
	onAddressBookChange: (value: string) => void;
	userContacts?: ContactWithFavorite[];
	profileImages: (ProfileImage | null)[];
	workspacePublicId: string;
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

	const finalFilteredUserContacts =
		selectedAddressBook === "all"
			? filteredUserContacts
			: filteredUserContacts.filter(
					(c) => c.addressBookId === selectedAddressBook,
				);

	if (finalFilteredUserContacts.length === 0) {
		return (
			<ContactsEmptyState
				filtered
				workspacePublicId={workspacePublicId}
				className="min-h-80"
			/>
		);
	}

	return (
		<div className="min-h-0 flex-1 overflow-y-auto">
			{finalFilteredUserContacts.map((c) => {
				const imagePath =
					c.profilePictureXs && profileImages
						? (profileImages.find((img) =>
								img?.path?.includes(c.profilePictureXs as string),
							)?.signedUrl ?? null)
						: null;

				return (
					<Link
						key={c.id}
						className={[
							"group flex min-h-14 w-full items-center gap-3 border-b border-border/50 px-4 py-2.5 text-left text-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
							c.publicId === params.contactsPublicId
								? "bg-accent text-accent-foreground hover:bg-accent"
								: "",
						].join(" ")}
						href={
							params.labelSlug
								? `/w/${workspacePublicId}/dashboard/contacts/label/${params.labelSlug}/contact/${c.publicId}`
								: `/w/${workspacePublicId}/dashboard/contacts/${c.publicId}`
						}
					>
						<ContactListAvatar
							signedUrl={imagePath}
							alt={c?.firstName}
							size={36}
						/>

						<div className="min-w-0 flex-1">
							<div className="flex items-center justify-between gap-2">
								<span className="truncate text-sm font-medium text-foreground">
									{c.firstName} {c.lastName}
								</span>
								{c.isFavorite && (
									<Star
										className="size-3.5 shrink-0 fill-amber-400 text-amber-400"
										aria-hidden="true"
									/>
								)}
							</div>
							<p className="truncate text-xs text-muted-foreground">
								{c.emails?.[0]?.address ?? c.company ?? ""}
							</p>
						</div>
					</Link>
				);
			})}
		</div>
	);
}

export default ContactsList;
