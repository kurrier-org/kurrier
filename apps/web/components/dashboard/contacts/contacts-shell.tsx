"use client";

import type { AddressBookEntity } from "@db";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import type React from "react";
import { useState } from "react";
import ContactsEmptyState from "@/components/dashboard/contacts/contacts-empty-state";
import ContactsList, {
	type ContactWithFavorite,
} from "@/components/dashboard/contacts/contacts-list";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
export type ProfileImage = {
	path: string;
	signedUrl: string;
};

export default function ContactsShell({
	children,
	userContacts,
	profileImages,
	workspacePublicId,
	userBook,
}: {
	children: React.ReactNode;
	userContacts: ContactWithFavorite[];
	profileImages: (ProfileImage | null)[];
	workspacePublicId: string;
	userBook?: AddressBookEntity;
}) {
	const dict = useOptionalDictionary();
	const pathname = usePathname();
	const params = useParams<{
		contactsPublicId?: string;
		labelSlug?: string;
	}>();

	const hasContactId = typeof params.contactsPublicId === "string";
	const isNewRoute = pathname.endsWith("/new");
	const isEditRoute = pathname.endsWith("/edit");

	const isDetailRoute = hasContactId || isNewRoute || isEditRoute;
	const isEmpty = userContacts.length === 0;

	const [selectedAddressBook, setSelectedAddressBook] = useState(
		userBook?.id ?? "all",
	);
	const listHref = params.labelSlug
		? `/w/${workspacePublicId}/dashboard/contacts/label/${params.labelSlug}`
		: `/w/${workspacePublicId}/dashboard/contacts`;
	const listHeader = (
		<div className="flex min-h-14 items-center justify-between gap-3 border-b px-4 py-3">
			<div className="flex min-w-0 items-center gap-2">
				<h2 className="truncate text-sm font-semibold text-foreground">
					{dict?.contacts?.allContacts ?? "All contacts"}
				</h2>
				<span className="inline-flex min-w-6 items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
					{userContacts.length}
				</span>
			</div>
			{!isEmpty && <NewContactButton workspacePublicId={workspacePublicId} />}
		</div>
	);

	return (
		<div className="flex min-h-0 flex-1 overflow-hidden bg-background">
			{isEmpty && !isDetailRoute ? (
				<section className="flex min-w-0 flex-1 flex-col">
					<ContactsEmptyState workspacePublicId={workspacePublicId} />
				</section>
			) : (
				<>
					<section
						className={`max-w-full flex-1 flex-col bg-muted/20 lg:w-80 lg:flex-none lg:border-r xl:w-96 ${
							isDetailRoute ? "hidden lg:flex" : "flex"
						}`}
					>
						{listHeader}
						<ContactsList
							userContacts={userContacts}
							selectedAddressBook={selectedAddressBook}
							onAddressBookChange={setSelectedAddressBook}
							profileImages={profileImages}
							workspacePublicId={workspacePublicId}
						/>
					</section>

					<section
						className={`min-w-0 flex-1 flex-col bg-background/60 ${
							isDetailRoute ? "flex" : "hidden lg:flex"
						}`}
					>
						{isDetailRoute && (
							<div className="border-b px-3 py-2 lg:hidden">
								<Link
									href={listHref}
									className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted"
								>
									<ArrowLeft className="size-4" />
									{dict?.common?.back ?? "Back"}
								</Link>
							</div>
						)}
						{children}
					</section>
				</>
			)}
		</div>
	);
}
