import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import ContactsShell from "@/components/dashboard/contacts/contacts-shell";
import { rlsClient } from "@/lib/actions/clients";
import { contactLabels, contacts, labels } from "@db";
import { eq } from "drizzle-orm";
import { ContactWithFavorite } from "@/components/dashboard/contacts/contacts-list";

export default async function ContactsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const rls = await rlsClient();

	const rows = await rls((tx) =>
		tx
			.select({
				contact: contacts,
				labelSlug: labels.slug,
			})
			.from(contacts)
			.leftJoin(contactLabels, eq(contactLabels.contactId, contacts.id))
			.leftJoin(labels, eq(labels.id, contactLabels.labelId)),
	);

	const grouped = new Map<string, ContactWithFavorite & { labels: string[] }>();

	for (const row of rows) {
		const existing =
			grouped.get(row.contact.id) ??
			({
				...row.contact,
				isFavorite: false,
				labels: [],
			} as ContactWithFavorite & { labels: string[] });

		if (row.labelSlug && !existing.labels.includes(row.labelSlug)) {
			existing.labels.push(row.labelSlug);
		}

		if (row.labelSlug === "favorite") {
			existing.isFavorite = true;
		}

		grouped.set(row.contact.id, existing);
	}

	const allContacts = Array.from(grouped.values());

	return (
		<>
			<header className="flex items-center gap-2 border-b bg-background/60 backdrop-blur py-3 px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="data-[orientation=vertical]:h-4"
				/>
				<h1 className="text-sm font-semibold text-foreground/80">Contacts</h1>
			</header>

			<ContactsShell userContacts={allContacts}>{children}</ContactsShell>
		</>
	);
}
