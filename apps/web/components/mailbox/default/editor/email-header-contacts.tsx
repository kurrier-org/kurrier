"use client";
import {
	type ComboboxItem,
	FocusTrap,
	type OptionsFilter,
	TagsInput,
	type TagsInputProps,
} from "@mantine/core";
import type { ComposeContact } from "@schema";
import { useState } from "react";
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

	const uniqueByEmail = (arr: ComposeContact[]) => {
		const seen = new Set();
		return arr.filter((item) => {
			if (seen.has(item.email)) return false;
			seen.add(item.email);
			return true;
		});
	};

	const searchContacts = async (val: string) => {
		setSearchValue(val);

		const rowsContacts = await searchContactsForCompose(val);
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
		const s = search.toLowerCase();
		return (options as ComboboxItem[]).filter((opt) =>
			opt.label.toLowerCase().includes(s),
		);
	};

	return (
		<FocusTrap active={true}>
			<TagsInput
				defaultValue={toEmail ? [toEmail] : []}
				searchValue={searchValue}
				onSearchChange={searchContacts}
				data={options}
				onChange={(value) => {
					if (value.length > 0) {
						onChange?.(value as string[]);
					}
				}}
				renderOption={renderOption}
				filter={filter}
				maxTags={maxTags}
				name={name}
				size="sm"
				variant="unstyled"
				className="min-h-7 w-full min-w-0 text-sm sm:w-96 sm:max-w-full"
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
	);
}
