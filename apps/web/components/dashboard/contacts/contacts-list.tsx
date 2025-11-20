"use client";
import React from "react";
import Link from "next/link";
import { ContactEntity } from "@db";
import NextImage from "next/image";
import { useParams } from "next/navigation";

function ContactsList({
	userContacts,
	profileImages,
}: {
	userContacts?: ContactEntity[];
	profileImages:
		| {
				error: string | null;
				path: string | null;
				signedUrl: string;
		  }[]
		| null;
}) {
	const params = useParams();

	return (
		<>
			<div className="overflow-y-auto flex-col h-[calc(100vh-10rem)]">
				{userContacts?.map((c, idx) => {
					const imagePath =
						profileImages?.find((img) =>
							img.path?.includes(c.profilePictureXs || ""),
						)?.signedUrl || null;
					return (
						<Link
							key={c.id}
							className={[
								"flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-background",
								c.publicId === params.contactsPublicId
									? "text-brand dark:text-white bg-brand-100 dark:bg-neutral-800 hover:text-brand hover:bg-brand-100"
									: "",
							].join(" ")}
							href={`/dashboard/contacts/${c.publicId}`}
						>
							{imagePath ? (
								<NextImage
									src={imagePath}
									alt={c.firstName}
									unoptimized
									width={50}
									height={50}
									className={
										"rounded-full h-8 w-8 object-cover object-top-left"
									}
								/>
							) : (
								<div
									className={[
										"flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
										"bg-pink-500",
									].join(" ")}
								>
									{c?.firstName?.split("")[0]}
								</div>
							)}

							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">
									{c.firstName} {c.lastName}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{c.emails && c.emails.length > 0 ? c.emails[0].address : ""}
								</p>
							</div>
						</Link>
					);
				})}
			</div>
		</>
	);
}

export default ContactsList;
