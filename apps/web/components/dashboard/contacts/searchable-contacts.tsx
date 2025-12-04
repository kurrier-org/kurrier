"use client";
import React, { useState } from "react";
import { ComboboxItem, TagsInput, TagsInputProps } from "@mantine/core";
import { searchContactsForCompose } from "@/lib/actions/mailbox";
import ContactSuggestionItem from "@/components/mailbox/default/editor/contact-suggestion-item";

export default function SearchableContacts({
	name,
	onChange,
}: {
	name: string;
	onChange?: (value: string[]) => void;
}) {
	const [searchValue, setSearchValue] = useState("");
	const [options, setOptions] = useState<ComboboxItem[]>([]);

	const searchContacts = async (val: string) => {
		setSearchValue(val);

		const rows = await searchContactsForCompose(val);

		const mapped: ComboboxItem[] = rows.map((row) => ({
			value: row.email,
			label: row.email,
			avatar: row.avatar,
		}));

		setOptions(mapped);
	};

	const renderOption: TagsInputProps["renderOption"] = ({ option }) => (
		<ContactSuggestionItem option={option} />
	);

	return (
		<>
			<TagsInput
				searchValue={searchValue}
				onSearchChange={searchContacts}
				data={options}
				onChange={(value) => {
					if (value.length > 0) {
						onChange && onChange(value as string[]);
					}
				}}
				renderOption={renderOption}
				name={name}
				size="sm"
				className="min-h-[28px] text-sm w-96"
				comboboxProps={{
					dropdownPadding: 0,
					withinPortal: false,
					position: "bottom-start",
					offset: 1,
					width: "target",
					shadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
					transitionProps: { transition: "skew-down", duration: 150 },
				}}
			/>
		</>
	);
}
