"use client";

import * as React from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { Container } from "@/components/common/containers";
import { Building, Cake, File, Mail, MapPinPlus, Phone } from "lucide-react";
import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import ReusableFormCustomWrapper from "@/components/common/reusable-form-custom-wrapper";
import { DatePickerInput } from "@mantine/dates";
import { getCountryDataList, getEmojiFlag, TCountryCode } from "countries-list";
import { FieldConfig, FormState, PublicConfig } from "@schema";
import NextImage from "next/image";
import { createThumbnail } from "@/lib/utils";
import { User } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { extension } from "mime-types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ContactEntity } from "@db";

export default function NewContactForm({
	contact = null,
	profilePictureUrl,
	createContactAction,
	user,
	publicConfig,
}: {
	contact?: ContactEntity | null;
	profilePictureUrl?: string | null;
	createContactAction: (
		_prev: FormState,
		formData: FormData,
	) => Promise<FormState>;
	user: User | null;
	publicConfig: PublicConfig;
}) {
	const [preview, setPreview] = React.useState<string | null>(
		profilePictureUrl ?? null,
	);
	const fileRef = React.useRef<HTMLInputElement>(null);

	const [emailRows, setEmailRows] = React.useState<number[]>(() =>
		contact?.emails?.length ? contact.emails.map((_, i) => i) : [],
	);

	const [phoneRows, setPhoneRows] = React.useState<number[]>(() =>
		contact?.phones?.length ? contact.phones.map((_, i) => i) : [],
	);

	const [addressRows, setAddressRows] = React.useState<number[]>(() =>
		contact?.addresses?.length ? contact.addresses.map((_, i) => i) : [],
	);

	const newContactPublicId = React.useRef(contact?.publicId ?? nanoid(10));

	const countryPhoneOptions = React.useMemo(() => {
		const list = getCountryDataList();
		return list
			.map((listItem) => {
				const emoji = getEmojiFlag(listItem.iso2 as TCountryCode) || "";
				return {
					value: listItem.iso2,
					label: `${emoji} ${listItem.name} (+${listItem.phone[0]})`,
				};
			})
			.filter(Boolean) as { value: string; label: string }[];
	}, []);

	const countryOptions = React.useMemo(() => {
		const list = getCountryDataList();
		return list
			.map((listItem) => {
				const emoji = getEmojiFlag(listItem.iso2 as TCountryCode) || "";
				return {
					value: listItem.iso2,
					label: `${emoji} ${listItem.name}`,
				};
			})
			.filter(Boolean) as { value: string; label: string }[];
	}, []);

	const handleFileSelect = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = event.target.files?.[0];
		if (!file || !user) return;

		const base64 = (await createThumbnail(file, "dataUrl", 512, 0.2)) as string;
		setPreview(base64);

		const supabase = createClient(publicConfig);
		const basePath = `private/${user.id}/contacts/${newContactPublicId.current}`;
		const ext = (extension(file.type) || "jpg").toString();

		const mainPath = `${basePath}/${nanoid(12)}.${ext}`;
		const thumbPath = `${basePath}/${nanoid(12)}_xs.${ext}`;

		const mainFile = (await createThumbnail(file, "file", 1920, 1)) as File;
		const thumbFile = (await createThumbnail(file, "file", 128, 0.2)) as File;

		const [mainRes, thumbRes] = await Promise.all([
			supabase.storage.from("attachments").upload(mainPath, mainFile),
			supabase.storage.from("attachments").upload(thumbPath, thumbFile),
		]);

		if (!mainRes.error && !thumbRes.error) {
			const profileField = document.querySelector(
				"input[name='profilePicture']",
			) as HTMLInputElement | null;
			const profileXsField = document.querySelector(
				"input[name='profilePictureXs']",
			) as HTMLInputElement | null;
			const publicIdField = document.querySelector(
				"input[name='publicId']",
			) as HTMLInputElement | null;

			if (profileField) profileField.value = mainPath;
			if (profileXsField) profileXsField.value = thumbPath;
			if (publicIdField) publicIdField.value = newContactPublicId.current;
		}
	};

	const addEmailRow = () => {
		setEmailRows((rows) => [
			...rows,
			rows.length === 0 ? 0 : rows[rows.length - 1] + 1,
		]);
	};

	const removeEmailRow = (id: number) => {
		setEmailRows((rows) => rows.filter((r) => r !== id));
	};

	const addPhoneRow = () => {
		setPhoneRows((rows) => [
			...rows,
			rows.length === 0 ? 0 : rows[rows.length - 1] + 1,
		]);
	};

	const removePhoneRow = (id: number) => {
		setPhoneRows((rows) => rows.filter((r) => r !== id));
	};

	const addAddressRow = () => {
		setAddressRows((rows) => [
			...rows,
			rows.length === 0 ? 0 : rows[rows.length - 1] + 1,
		]);
	};

	const removeAddressRow = (id: number) => {
		setAddressRows((rows) => rows.filter((r) => r !== id));
	};

	const emails = contact?.emails ?? [];
	const phones = contact?.phones ?? [];
	const addresses = contact?.addresses ?? [];

	const fields: FieldConfig[] = [
		{
			el: (
				<div className="flex flex-col items-center mb-4">
					<input
						type="file"
						accept="image/*"
						className="hidden"
						ref={fileRef}
						onChange={handleFileSelect}
					/>
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						className="rounded-full overflow-hidden"
					>
						<NextImage
							height={512}
							width={512}
							src={
								preview ||
								profilePictureUrl ||
								"https://placehold.co/512x512/png?text=Edit+Profile+Picture"
							}
							unoptimized={true}
							className="object-cover rounded-full border w-36 h-36 object-top-left"
							alt="Profile"
						/>
					</button>
					{contact?.profilePicture ? (
						<input
							type="hidden"
							name="profilePicture"
							defaultValue={contact?.profilePicture || ""}
						/>
					) : (
						<input type="hidden" name="profilePicture" />
					)}
					{contact?.profilePictureXs ? (
						<input
							type="hidden"
							name="profilePictureXs"
							defaultValue={contact?.profilePictureXs || ""}
						/>
					) : (
						<input type="hidden" name="profilePictureXs" />
					)}
				</div>
			),
			wrapperClasses: "col-span-12",
		},

		{
			name: "firstName",
			label: "First name",
			wrapperClasses: "col-span-12 md:col-span-6",
			props: { required: true, defaultValue: contact?.firstName || "" },
		},
		{
			name: "lastName",
			label: "Last name",
			wrapperClasses: "col-span-12 md:col-span-6",
			props: { defaultValue: contact?.lastName || "" },
		},

		{
			wrapperClasses: "col-span-12",
			el: (
				<div className="mt-4 flex items-center gap-2 text-md font-medium text-brand dark:text-brand-foreground">
					<Building size={18} />
					Organization
				</div>
			),
		},
		{
			name: "company",
			label: "Company",
			wrapperClasses: "col-span-12",
			props: { defaultValue: contact?.company || "" },
		},
		{
			name: "jobTitle",
			label: "Job title",
			wrapperClasses: "col-span-12",
			props: { defaultValue: contact?.jobTitle || "" },
		},
		{
			name: "department",
			label: "Department",
			wrapperClasses: "col-span-12",
			props: { defaultValue: contact?.department || "" },
		},

		{
			wrapperClasses: "col-span-12",
			el: (
				<div className="mt-4 flex items-center gap-2 text-md font-medium text-brand dark:text-brand-foreground">
					<Mail size={18} />
					Email
				</div>
			),
		},

		...emailRows.flatMap<FieldConfig>((id, index) => [
			{
				name: `emails.${id}.address`,
				label: index === 0 ? "Email" : `Email ${index + 1}`,
				wrapperClasses: "col-span-12",
				props: {
					type: "email",
					defaultValue: emails[id]?.address ?? "",
				},
				bottomEndSuffix:
					emailRows.length > 1 ? (
						<button
							type="button"
							onClick={() => removeEmailRow(id)}
							className="text-xs text-muted-foreground hover:underline"
						>
							Remove
						</button>
					) : undefined,
			},
		]),

		{
			wrapperClasses: "col-span-12",
			el: (
				<Button
					type="button"
					variant="light"
					leftSection={<IconPlus />}
					fullWidth
					onClick={addEmailRow}
				>
					Add email
				</Button>
			),
		},

		{
			wrapperClasses: "col-span-12",
			el: (
				<div className="mt-4 flex items-center gap-2 text-md font-medium text-brand dark:text-brand-foreground">
					<Phone size={18} />
					Phone
				</div>
			),
		},

		...phoneRows.flatMap<FieldConfig>((id, index) => [
			{
				name: `phones.${id}.code`,
				label: "Country code",
				wrapperClasses: "col-span-4 md:col-span-3",
				kind: "select",
				options: countryPhoneOptions,
				props: {
					className: "w-full",
					searchable: true,
					defaultValue: phones[id]?.code ?? "",
				},
			},
			{
				name: `phones.${id}.number`,
				label: index === 0 ? "Phone" : `Phone ${index + 1}`,
				wrapperClasses: "col-span-8 md:col-span-9",
				props: {
					required: index === 0,
					defaultValue: phones[id]?.number ?? "",
				},
				bottomEndSuffix:
					phoneRows.length > 1 ? (
						<button
							type="button"
							onClick={() => removePhoneRow(id)}
							className="text-xs text-muted-foreground hover:underline"
						>
							Remove
						</button>
					) : undefined,
			},
		]),

		{
			wrapperClasses: "col-span-12",
			el: (
				<Button
					type="button"
					variant="light"
					leftSection={<IconPlus />}
					fullWidth
					onClick={addPhoneRow}
				>
					Add phone
				</Button>
			),
		},

		{
			wrapperClasses: "col-span-12",
			el: (
				<div className="mt-4 flex items-center gap-2 text-md font-medium text-brand dark:text-brand-foreground">
					<MapPinPlus size={18} />
					Address
				</div>
			),
		},

		...addressRows.flatMap<FieldConfig>((id, index) => [
			{
				name: `addresses.${id}.country`,
				label: index === 0 ? "Country" : `Country (${index + 1})`,
				wrapperClasses: "col-span-12",
				kind: "select",
				options: countryOptions,
				props: {
					className: "w-full",
					searchable: true,
					defaultValue: addresses[id]?.country ?? "",
				},
			},
			{
				name: `addresses.${id}.streetAddress`,
				label: "Street address",
				wrapperClasses: "col-span-12",
				props: {
					defaultValue: addresses[id]?.streetAddress ?? "",
				},
			},
			{
				name: `addresses.${id}.streetAddressLine2`,
				label: "Street address line 2",
				wrapperClasses: "col-span-12",
				props: {
					defaultValue: addresses[id]?.streetAddressLine2 ?? "",
				},
			},
			{
				name: `addresses.${id}.city`,
				label: "City",
				wrapperClasses: "col-span-12",
				props: {
					defaultValue: addresses[id]?.city ?? "",
				},
			},
			{
				name: `addresses.${id}.state`,
				label: "State",
				wrapperClasses: "col-span-6",
				props: {
					defaultValue: addresses[id]?.state ?? "",
				},
			},
			{
				name: `addresses.${id}.code`,
				label: "Postal / ZIP code",
				wrapperClasses: "col-span-6",
				bottomEndSuffix:
					addressRows.length > 1 ? (
						<button
							type="button"
							onClick={() => removeAddressRow(id)}
							className="text-xs text-muted-foreground hover:underline"
						>
							Remove
						</button>
					) : undefined,
				props: {
					defaultValue: addresses[id]?.code ?? "",
				},
			},
		]),

		{
			wrapperClasses: "col-span-12",
			el: (
				<Button
					type="button"
					variant="light"
					leftSection={<IconPlus />}
					fullWidth
					onClick={addAddressRow}
				>
					Add address
				</Button>
			),
		},

		{
			wrapperClasses: "col-span-12",
			el: (
				<div className="mt-4 flex items-center gap-2 text-md font-medium text-brand dark:text-brand-foreground">
					<Cake size={18} />
					Birthday
				</div>
			),
		},
		{
			name: "dob",
			wrapperClasses: "col-span-12",
			kind: "custom",
			component: ReusableFormCustomWrapper,
			props: {
				component: DatePickerInput,
				placeholder: "Select date",
				defaultValue: contact?.dob ? contact.dob : null,
			},
		},

		{
			wrapperClasses: "col-span-12",
			el: (
				<div className="mt-4 flex items-center gap-2 text-md font-medium text-brand dark:text-brand-foreground">
					<File size={18} />
					Notes
				</div>
			),
		},
		{
			name: "notes",
			label: "Notes",
			wrapperClasses: "col-span-12",
			kind: "textarea",
			props: {
				rows: 4,
				defaultValue: contact?.notes || "",
			},
		},
	];

	const router = useRouter();

	return (
		<Container variant="narrow" className="my-8">
			<div className="flex items-center justify-between my-2 mb-8">
				<h1 className="text-xl font-bold text-foreground">
					{contact
						? `Edit ${contact.firstName} ${contact.lastName}`
						: "New Contact Form"}
				</h1>
			</div>
			<ReusableForm
				fields={fields}
				action={createContactAction}
				onSuccess={(newContact) =>
					router.push(`/dashboard/contacts/${newContact.publicId}`)
				}
			/>
		</Container>
	);
}
