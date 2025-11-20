import React from "react";
import NextImage from "next/image";
import { eq } from "drizzle-orm";
import { rlsClient } from "@/lib/actions/clients";
import { contacts } from "@db";
import {createClient} from "@/lib/supabase/server";
import {Button} from "@mantine/core";
import {IconEdit} from "@tabler/icons-react";
import Link from "next/link";
import DeleteContactButton from "@/components/dashboard/contacts/delete-contact-button";
import {revalidatePath} from "next/cache";

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

    const initials =
        [contact.firstName, contact.lastName]
            .filter(Boolean)
            .map((s) => s?.trim()[0])
            .join("")
            .toUpperCase() || "?";

    const emails = Array.isArray(contact.emails) ? contact.emails : [];
    const phones = Array.isArray(contact.phones) ? contact.phones : [];
    const addresses = Array.isArray(contact.addresses) ? contact.addresses : [];

    const supabase = await createClient();
    const { data } = await supabase.storage
        .from("attachments")
        .createSignedUrl(String(contact.profilePicture), 600);
    const profilePictureUrl = data?.signedUrl || null;

    const onDeleteAction = async (id: string) => {
        "use server";
        const rls = await rlsClient();
        await rls((tx) =>
            tx.delete(contacts).where(eq(contacts.id, id)),
        );
        revalidatePath("/dashboard/contacts");
        return { success: true  };
    };

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-4 border-b px-6 py-4">
                {profilePictureUrl ? (
                    <NextImage
                        src={profilePictureUrl}
                        alt={contact.firstName}
                        unoptimized
                        width={80}
                        height={80}
                        className="h-16 w-16 rounded-full object-cover object-top-left"
                    />
                ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-primary/80 to-primary text-lg font-semibold uppercase text-primary-foreground">
                        {initials}
                    </div>
                )}

                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold text-foreground">
                        {contact.firstName} {contact.lastName}
                    </h2>
                    {contact.company || contact.jobTitle ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                            {[contact.jobTitle, contact.company].filter(Boolean).join(" · ")}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link href={`/dashboard/contacts/${contact.publicId}/edit`}>
                        <Button size={"xs"} leftSection={<IconEdit size={14} stroke={1.5} />}>
                            Edit
                        </Button>
                    </Link>
                    <DeleteContactButton contact={contact} onDeleteAction={onDeleteAction} />
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-4 text-sm">
                <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Contact details
                    </h3>
                    <dl className="grid grid-cols-1 gap-y-3 gap-x-8 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs text-muted-foreground">Primary email</dt>
                            <dd className="mt-0.5 text-foreground">
                                {emails.length > 0 && emails[0]?.address
                                    ? emails[0].address
                                    : "Not specified"}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Primary phone</dt>
                            <dd className="mt-0.5 text-foreground">
                                {phones.length > 0 && phones[0]?.number
                                    ? `${phones[0].code ? `+${phones[0].code} ` : ""}${phones[0].number}`
                                    : "Not specified"}
                            </dd>
                        </div>
                    </dl>

                    {(emails.length > 1 || phones.length > 1) && (
                        <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {emails.length > 1 && (
                                <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        All emails
                                    </p>
                                    <ul className="space-y-1.5">
                                        {emails.map((e, idx) =>
                                            e?.address ? (
                                                <li
                                                    key={`${e.address}-${idx}`}
                                                    className="flex items-center justify-between rounded-md border px-3 py-1.5 text-xs"
                                                >
                                                    <span className="truncate">{e.address}</span>
                                                </li>
                                            ) : null,
                                        )}
                                    </ul>
                                </div>
                            )}

                            {phones.length > 1 && (
                                <div>
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        All phones
                                    </p>
                                    <ul className="space-y-1.5">
                                        {phones.map((p, idx) =>
                                                p?.number ? (
                                                    <li
                                                        key={`${p.number}-${idx}`}
                                                        className="flex items-center justify-between rounded-md border px-3 py-1.5 text-xs"
                                                    >
                          <span className="truncate">
                            {p.code ? `+${p.code} ` : ""}
                              {p.number}
                          </span>
                                                    </li>
                                                ) : null,
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {addresses.length > 0 && (
                    <section className="space-y-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Addresses
                        </h3>
                        <div className="space-y-2">
                            {addresses.map((addr, idx) => {
                                const lines = [
                                    [addr.streetAddress, addr.streetAddressLine2]
                                        .filter(Boolean)
                                        .join(", "),
                                    [addr.city, addr.state, addr.code].filter(Boolean).join(", "),
                                    addr.country,
                                ]
                                    .filter((l) => l && l.trim().length > 0)
                                    .join("\n");

                                if (!lines) return null;

                                return (
                                    <div
                                        key={idx}
                                        className="whitespace-pre-line rounded-md border bg-muted/40 px-3 py-2 text-xs text-foreground"
                                    >
                                        {lines}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {contact.notes && contact.notes.trim().length > 0 && (
                    <section className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Notes
                        </h3>
                        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm leading-relaxed">
                            {contact.notes}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default Page;
