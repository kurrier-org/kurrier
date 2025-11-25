"use client";

import React from "react";
import ContactsList, {
    ContactWithFavorite,
} from "@/components/dashboard/contacts/contacts-list";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";
import { useParams, usePathname } from "next/navigation";
import { useMediaQuery } from "@mantine/hooks";

type ProfileImage = {
    error: string | null;
    path: string | null;
    signedUrl: string;
};

export default function ContactsShell({ children, userContacts, profileImages}: {
    children: React.ReactNode;
    userContacts: ContactWithFavorite[];
    profileImages: ProfileImage[] | null;
}) {
    const pathname = usePathname();
    const params = useParams<{
        contactsPublicId?: string;
        labelSlug?: string;
    }>();

    const isMobile = useMediaQuery("(max-width: 768px)");

    const hasContactId = typeof params.contactsPublicId === "string";
    const isNewRoute = pathname.endsWith("/new");
    const isEditRoute = pathname.endsWith("/edit");

    const isDetailRoute = hasContactId || isNewRoute || isEditRoute;

    const showList = !isMobile || !isDetailRoute;
    const showDetail = !isMobile || isDetailRoute;

    return (
        <main className="flex flex-1 flex-col h-[calc(100vh-4rem)] overflow-hidden p-3 sm:p-4">
            <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border bg-background/70">
                {showList && (
                    <section
                        className={
                            isMobile
                                ? "flex-1 max-w-full flex-col bg-muted/40"
                                : "flex max-w-full flex-col border-r bg-muted/40 md:w-80 lg:w-96"
                        }
                    >
                        <div className="flex items-center justify-between border-b px-3 py-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                All contacts
              </span>
                            <NewContactButton />
                        </div>
                        <ContactsList
                            userContacts={userContacts}
                            profileImages={profileImages}
                        />
                    </section>
                )}

                {showDetail && (
                    <section className="flex-1 flex-col bg-background/60">
                        {children}
                    </section>
                )}
            </div>
        </main>
    );
}
