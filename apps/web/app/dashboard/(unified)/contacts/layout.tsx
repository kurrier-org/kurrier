import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import ContactsShell from "@/components/dashboard/contacts/contacts-shell";
import {rlsClient} from "@/lib/actions/clients";
import {contacts} from "@db";

export default async function ContactsLayout({ children }: { children: React.ReactNode }) {

    const rls = await rlsClient();
    const allContacts = await rls((tx) =>
        tx.select().from(contacts),
    );

    return (
        <>
            <header className="flex items-center gap-2 border-b bg-background/60 backdrop-blur py-3 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="data-[orientation=vertical]:h-4" />
                <h1 className="text-sm font-semibold text-foreground/80">Contacts</h1>
            </header>

            <ContactsShell userContacts={allContacts}>{children}</ContactsShell>
        </>
    );
}
