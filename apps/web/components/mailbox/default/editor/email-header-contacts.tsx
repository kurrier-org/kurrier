"use client";

import React, { useState } from "react";
import {
	type ComboboxItem,
	type OptionsFilter,
	TagsInput,
	type TagsInputProps,
} from "@mantine/core";

import ContactSuggestionItem from "@/components/mailbox/default/editor/contact-suggestion-item";
import { searchContactsForCompose } from "@/lib/actions/calendar";
import type { ComposeContact } from "@schema";

export default function EmailHeaderContacts({
												name,
												toEmail,
												maxTags,
												onChange,
											}: {
	toEmail?: string;
	maxTags?: number;
	onChange?: (value: string[]) => void;
	name: string;
}) {
	const [searchValue, setSearchValue] = useState("");
	const [options, setOptions] = useState<ComboboxItem[]>([]);

	const uniqueByEmail = (arr: ComposeContact[]) => {
		const seen = new Set<string>();

		return arr.filter((item) => {
			if (seen.has(item.email)) return false;

			seen.add(item.email);
			return true;
		});
	};

	const searchContacts = async (value: string) => {
		setSearchValue(value);

		const rowsContacts = await searchContactsForCompose(value);
		const rows = uniqueByEmail(rowsContacts);

		const mapped: ComboboxItem[] = rows.map((row) => ({
			value: row.email,
			label: `${row.name} <${row.email}>`,
			avatar: row.avatar,
		}));

		setOptions(mapped);
	};

	const renderOption: TagsInputProps["renderOption"] = ({ option }) => (
		<ContactSuggestionItem option={option} />
	);

	const filter: OptionsFilter = ({ options, search }) => {
		const value = search.toLowerCase();

		return (options as ComboboxItem[]).filter((option) =>
			option.label.toLowerCase().includes(value),
		);
	};

	return (
		<TagsInput
			defaultValue={toEmail ? [toEmail] : []}
			searchValue={searchValue}
			onSearchChange={searchContacts}
			data={options}
			onChange={(value) => {
				onChange?.(value as string[]);
			}}
			renderOption={renderOption}
			filter={filter}
			maxTags={maxTags}
			name={name}
			size="sm"
			variant="unstyled"
			className="min-h-[28px] w-96 text-sm"
			comboboxProps={{
				dropdownPadding: 0,
				withinPortal: false,
				position: "bottom-start",
				offset: 1,
				width: "target",
				shadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
				transitionProps: {
					transition: "skew-down",
					duration: 150,
				},
			}}
		/>
	);
}
