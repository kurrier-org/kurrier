"use client";
import React, { useState } from "react";
import {
	ComboboxItem,
	TagsInput,
	TagsInputProps,
	OptionsFilter,
	FocusTrap,
} from "@mantine/core";
import ContactSuggestionItem from "@/components/mailbox/default/editor/contact-suggestion-item";
import { searchContactsForCompose } from "@/lib/actions/calendar";

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

	const searchContacts = async (val: string) => {
		setSearchValue(val);

		const rows = await searchContactsForCompose(val);

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
		const s = search.toLowerCase();
		return (options as ComboboxItem[]).filter((opt) =>
			opt.label.toLowerCase().includes(s),
		);
	};

	return (
		<>
			<FocusTrap active={true}>
				<TagsInput
					defaultValue={toEmail ? [toEmail] : []}
					searchValue={searchValue}
					onSearchChange={searchContacts}
					data={options}
					onChange={(value) => {
						if (value.length > 0) {
							onChange && onChange(value as string[]);
						}
					}}
					renderOption={renderOption}
					filter={filter}
					maxTags={maxTags}
					name={name}
					size="sm"
					variant="unstyled"
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
			</FocusTrap>
		</>
	);
}
