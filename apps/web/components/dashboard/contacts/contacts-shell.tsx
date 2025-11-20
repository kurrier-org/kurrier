import React from "react";
import ContactsList from "@/components/dashboard/contacts/contacts-list";
import NewContactButton from "@/components/dashboard/contacts/new-contact-button";
import {ContactEntity} from "@db";
import {createClient} from "@/lib/supabase/server";

export default async function ContactsShell({ children, userContacts}: { children: React.ReactNode, userContacts: ContactEntity[]}) {
    const userProfileImages = userContacts.map((contact) => contact.profilePictureXs).filter(Boolean) as string[];
    const supabase = await createClient();
    const { data } = await supabase
        .storage
        .from('attachments')
        .createSignedUrls(userProfileImages, 600)

    return (
        <main className="flex flex-1 flex-col h-[calc(100vh-4rem)] overflow-hidden p-3 sm:p-4">
            <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border bg-background/70">
                <section className={`flex max-w-full flex-col border-r bg-muted/40 md:w-80 lg:w-96`}>
                    <div className="flex items-center justify-between border-b px-3 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All contacts
            </span>
                        <NewContactButton />
                    </div>
                    <ContactsList userContacts={userContacts} profileImages={data} />
                </section>

                <section className={`flex-1 flex-col bg-background/60`}>
                    {children}
                </section>
            </div>
        </main>
    );
}
