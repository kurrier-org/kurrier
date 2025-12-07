"use client";
import React, { useState } from "react";
import {ComboboxItem, TagsInput, TagsInputProps} from "@mantine/core";
import ContactSuggestionItem from "@/components/mailbox/default/editor/contact-suggestion-item";
import {searchContactsForCompose} from "@/lib/actions/calendar";

export default function SearchableContacts({ onChange }: { onChange?: (value: string, contact: ComboboxItem | undefined) => void; }) {
	const [searchValue, setSearchValue] = useState("");
	const [options, setOptions] = useState<ComboboxItem[]>([]);

    const [searchableContacts, setSearchableContacts] = useState<string[]>([]);

	const searchContacts = async (val: string) => {
		setSearchValue(val);

		const rows = await searchContactsForCompose(val);

        const seen = new Set<string>();
        const mapped: ComboboxItem[] = rows
            .map(row => ({
                value: row.id,
                row: row,
                label: `${row.email}`,
                name: row.name,
                avatar: row.avatar,
            }))
            .filter(item => {
                if (seen.has(item.value)) return false;
                seen.add(item.value);
                return true;
            });

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
                value={searchableContacts}
                onOptionSubmit={(val) => {
                    const contact = options.find(o => o.value === val);
                    onChange && onChange(val, contact)
                }}
				onChange={(value) => {
					if (value.length > 0) {
                        setSearchableContacts([])
					}
				}}
				renderOption={renderOption}
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
