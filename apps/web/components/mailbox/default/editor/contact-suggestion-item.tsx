import React from "react";
import { ComboboxLikeRenderOptionInput } from "@mantine/core";
import ContactListAvatar from "@/components/dashboard/contacts/contact-list-avatar";

export default function ContactSuggestionItem({
	option,
}: ComboboxLikeRenderOptionInput<any>["option"]) {
	return (
		<div className="flex gap-3 justify-start items-center p-1">
			<ContactListAvatar signedUrl={option.avatar} alt={option.label} />

			<div className="flex flex-col min-w-24">
				{option.name && (
					<span className="text-[13px] text-gray-500 truncate">
						{option.name}
					</span>
				)}
				<span className="font-light text-xs truncate">{option.label}</span>
			</div>
		</div>
	);
}
