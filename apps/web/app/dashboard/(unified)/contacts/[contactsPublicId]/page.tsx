import React from "react";
import NextImage from "next/image";
import { eq } from "drizzle-orm";
import { rlsClient } from "@/lib/actions/clients";
import { contacts } from "@db";
import { createClient } from "@/lib/supabase/server";
import { ActionIcon } from "@mantine/core";
import { IconEdit, IconLabelFilled } from "@tabler/icons-react";
import Link from "next/link";
import DeleteContactButton from "@/components/dashboard/contacts/delete-contact-button";
import { revalidatePath } from "next/cache";
import { ContactLabelHoverButtons } from "@/components/dashboard/labels/contact-label-hover-buttons";
import {
	fetchContactLabelsByContactIds,
	fetchLabels,
	toggleFavoriteContact,
} from "@/lib/actions/labels";
import { LabelScope } from "@schema";
import { Star } from "lucide-react";
import Form from "next/form";
import { getCountryDataList, TCountryCode } from "countries-list";
import {getRedis} from "@/lib/actions/get-redis";
import {isSignedIn} from "@/lib/actions/auth";

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
        const {davQueue} = await getRedis()
        const user = await isSignedIn()
        await davQueue.add("dav:delete-contact", {contactId: id, ownerId: user?.id})
		const rls = await rlsClient();
		await rls((tx) => tx.delete(contacts).where(eq(contacts.id, id)));
		revalidatePath("/dashboard/contacts");
		return { success: true };
	};

	const allLabels = await fetchLabels("contact" as LabelScope);
	const labelsByContactId = await fetchContactLabelsByContactIds([contact.id]);

	const isFavorite = labelsByContactId[contact.id]?.some(
		(entry) => entry.label.name === "Favorite",
	);

	const countryData = getCountryDataList();
	const phoneByCountry = new Map<string, string>(
		countryData.map((c) => [c.iso2, String(c.phone).split(",")[0].trim()]),
	);

	function formatPhone(p: any) {
		if (!p?.number) return null;

		const countryCode = p.countryCode || p.code;
		let prefix = "";

		if (countryCode && phoneByCountry.has(countryCode as TCountryCode)) {
			prefix = `+${phoneByCountry.get(countryCode as TCountryCode)} `;
		}

		return `${prefix}${p.number}`;
	}

	const filteredLabels =
		labelsByContactId[contact.id]?.filter((l) => l.label.name !== "Favorite") ||
		[];

	function formatDob(dob?: string | null) {
		if (!dob) return "Not specified";
		try {
			return new Date(dob).toLocaleDateString(undefined, {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch {
			return dob;
		}
	}

	return (
		<div className="flex h-full flex-col">
			<div className="bg-gradient-to-b from-primary/5 via-background to-background/80 dark:from-primary/15 dark:via-background dark:to-background/40 px-3 py-4 sm:px-6 lg:px-8 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:shadow-[0_1px_0_rgba(15,23,42,0.6)]">
				<div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-4">
						{profilePictureUrl ? (
							<NextImage
								src={profilePictureUrl}
								alt={contact.firstName}
								unoptimized
								width={80}
								height={80}
								className="h-16 w-16 rounded-full object-cover object-top-left ring-2 ring-primary/30 dark:ring-primary/60"
							/>
						) : (
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-primary/80 to-primary text-lg font-semibold uppercase text-primary-foreground shadow-sm dark:shadow-[0_0_18px_rgba(129,140,248,0.35)]">
								{initials}
							</div>
						)}

						<div className="min-w-0 flex-1 space-y-1.5">
							<div className="flex flex-wrap items-center gap-2">
								<h2 className="truncate text-lg font-semibold text-foreground sm:text-xl">
									{contact.firstName} {contact.lastName}
								</h2>

								<Form action={toggleFavoriteContact}>
									<input name="contactId" type="hidden" value={contact.id} />
									<ActionIcon
										type="submit"
										variant="subtle"
										title="Toggle favorite"
										className="h-7 w-7 rounded-full bg-primary/5 text-amber-400 hover:bg-primary/10 dark:bg-primary/20 dark:hover:bg-primary/30"
									>
										<Star
											size={14}
											className={
												isFavorite
													? "text-yellow-400 fill-yellow-400"
													: "text-muted-foreground"
											}
										/>
									</ActionIcon>
								</Form>
							</div>

							{(contact.company || contact.jobTitle) && (
								<p className="truncate text-xs text-muted-foreground sm:text-[13px]">
									{[contact.jobTitle, contact.company]
										.filter(Boolean)
										.join(" · ")}
								</p>
							)}

							<div className="mt-2 flex flex-wrap items-center gap-2">
								{filteredLabels.length > 0 && (
									<div className="flex flex-wrap items-center gap-1.5">
										{filteredLabels.map((entry) => (
											<div
												key={entry.label.id}
												className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-1 text-[11px] text-foreground/90 dark:bg-primary/15"
											>
												<IconLabelFilled
													size={16}
													color={entry.label.colorBg ?? "#64748b"}
												/>
												<span className="truncate">{entry.label.name}</span>
											</div>
										))}
									</div>
								)}

								<div className="ml-auto sm:ml-0">
									<ContactLabelHoverButtons
										contact={contact}
										allLabels={allLabels}
										labelsByContactId={labelsByContactId}
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 sm:self-start">
						<Link href={`/dashboard/contacts/${contact.publicId}/edit`}>
							<ActionIcon
								size="sm"
								variant="outline"
								title="Edit contact"
								className="border-transparent bg-background/60 hover:bg-primary/5 dark:bg-background/80 dark:hover:bg-primary/15"
							>
								<IconEdit size={14} stroke={1.5} />
							</ActionIcon>
						</Link>

						<DeleteContactButton
							contact={contact}
							onDeleteAction={onDeleteAction}
						/>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto px-3 py-4 text-sm sm:px-6 lg:px-8">
				<div className="mx-auto flex max-w-5xl flex-col gap-5 sm:gap-6 lg:gap-8">
					<section className="relative overflow-hidden rounded-2xl bg-primary/5 px-4 py-4 transition-colors dark:bg-primary/15 sm:px-6 sm:py-5">
						<div className="pointer-events-none absolute inset-y-4 left-0 w-[3px] rounded-full bg-primary/50 dark:bg-primary/70" />
						<header className="mb-4 flex flex-wrap items-center justify-between gap-3">
							<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary dark:text-primary/90">
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/25">
									<span className="h-1.5 w-1.5 rounded-full bg-primary" />
								</span>
								<span>Contact details</span>
							</div>
							{(emails.length > 0 || phones.length > 0) && (
								<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-brand dark:bg-brand/25 dark:text-brand-foreground/90">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dark:bg-emerald-300" />
									{emails.length > 0 && phones.length > 0
										? "Email & phone on file"
										: emails.length > 0
											? "Email on file"
											: "Phone on file"}
								</span>
							)}
						</header>

						<dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<div className="space-y-1.5">
								<dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
									<span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary dark:bg-primary/25">
										@
									</span>
									<span>Primary email</span>
								</dt>
								<dd className="rounded-xl bg-white/70 px-3 py-2 text-[13px] text-foreground/90 ring-1 ring-white/40 backdrop-blur-sm dark:bg-slate-900/70 dark:text-slate-50 dark:ring-slate-900/80">
									{emails.length > 0 && emails[0]?.address ? (
										emails[0].address
									) : (
										<span className="text-muted-foreground/70">
											Not specified
										</span>
									)}
								</dd>
							</div>

							<div className="space-y-1.5">
								<dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
									<span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary dark:bg-primary/25">
										☎
									</span>
									<span>Primary phone</span>
								</dt>
								<dd className="rounded-xl bg-white/70 px-3 py-2 text-[13px] text-foreground/90 ring-1 ring-white/40 backdrop-blur-sm dark:bg-slate-900/70 dark:text-slate-50 dark:ring-slate-900/80">
									{phones.length > 0 && phones[0]?.number ? (
										formatPhone(phones[0])
									) : (
										<span className="text-muted-foreground/70">
											Not specified
										</span>
									)}
								</dd>
							</div>

							<div className="space-y-1.5">
								<dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
									<span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary dark:bg-primary/25">
										🎂
									</span>
									<span>Birthday</span>
								</dt>
								<dd className="rounded-xl bg-white/70 px-3 py-2 text-[13px] text-foreground/90 ring-1 ring-white/40 backdrop-blur-sm dark:bg-slate-900/70 dark:text-slate-50 dark:ring-slate-900/80">
									{formatDob(contact.dob) ?? (
										<span className="text-muted-foreground/70">
											Not specified
										</span>
									)}
								</dd>
							</div>
						</dl>

						{(emails.length > 1 || phones.length > 1) && (
							<div className="mt-5 grid gap-4 md:grid-cols-2">
								{emails.length > 1 && (
									<div className="space-y-2">
										<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
											All emails
										</p>
										<ul className="space-y-1.5">
											{emails.map((e, idx) =>
												e?.address ? (
													<li
														key={`${e.address}-${idx}`}
														className="group flex items-center gap-2 rounded-xl bg-white/60 px-3 py-1.5 text-[12px] text-foreground/90 transition-all hover:bg-white dark:bg-slate-900/70 dark:text-slate-50 dark:hover:bg-slate-900"
													>
														<span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 transition group-hover:scale-110" />
														<span className="truncate">{e.address}</span>
													</li>
												) : null,
											)}
										</ul>
									</div>
								)}

								{phones.length > 1 && (
									<div className="space-y-2">
										<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
											All phones
										</p>
										<ul className="space-y-1.5">
											{phones.map((p, idx) =>
												p?.number ? (
													<li
														key={`${p.number}-${idx}`}
														className="group flex items-center gap-2 rounded-xl bg-white/60 px-3 py-1.5 text-[12px] text-foreground/90 transition-all hover:bg-white dark:bg-slate-900/70 dark:text-slate-50 dark:hover:bg-slate-900"
													>
														<span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-500 transition group-hover:scale-110" />
														<span className="truncate">{formatPhone(p)}</span>
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
						<section className="relative overflow-hidden rounded-2xl bg-slate-50 px-4 py-4 transition-colors dark:bg-slate-900/70 sm:px-6 sm:py-5">
							<div className="pointer-events-none absolute inset-y-4 left-0 w-[3px] rounded-full bg-primary/30 dark:bg-primary/50" />
							<header className="mb-4 flex items-center justify-between gap-3">
								<div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[12px] text-primary dark:bg-primary/20">
										⬤
									</span>
									<span>Addresses</span>
								</div>
								<span className="text-[11px] text-muted-foreground/70">
									{addresses.length}{" "}
									{addresses.length === 1 ? "location" : "locations"}
								</span>
							</header>

							<div className="grid gap-3 sm:grid-cols-2">
								{addresses.map((addr, idx) => {
									const lines = [
										[addr.streetAddress, addr.streetAddressLine2]
											.filter(Boolean)
											.join(", "),
										[addr.city, addr.state, addr.code]
											.filter(Boolean)
											.join(", "),
										addr.country,
									]
										.filter((l) => l && l.trim().length > 0)
										.join("\n");

									if (!lines) return null;

									return (
										<div
											key={idx}
											className="group whitespace-pre-line rounded-xl bg-white/80 px-3.5 py-3 text-xs leading-relaxed text-foreground/90 transition-all  dark:bg-slate-900/80 dark:text-slate-50 dark:hover:bg-slate-900"
										>
											<div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/90">
												<span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary dark:bg-primary/25">
													●
												</span>
												<span>Location {idx + 1}</span>
											</div>
											{lines}
										</div>
									);
								})}
							</div>
						</section>
					)}

					{contact.notes && contact.notes.trim().length > 0 && (
						<section className="relative overflow-hidden rounded-2xl bg-slate-50 px-4 py-4 transition-colors dark:bg-slate-900/70 sm:px-6 sm:py-5">
							<div className="pointer-events-none absolute inset-y-4 left-0 w-[3px] rounded-full bg-primary/30 dark:bg-primary/50" />
							<h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[13px] text-primary dark:bg-primary/20">
									✎
								</span>
								<span>Notes</span>
							</h3>
							<div className="rounded-xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-foreground/90 dark:bg-slate-900/80 dark:text-slate-50">
								{contact.notes}
							</div>
						</section>
					)}
				</div>
			</div>
		</div>
	);
}

export default Page;
