import React from "react";
import { ComboboxLikeRenderOptionInput } from "@mantine/core";
import ContactListAvatar from "@/components/dashboard/contacts/contact-list-avatar";

export default function ContactSuggestionItem({ option }: ComboboxLikeRenderOptionInput<any>["option"]) {
    return (
        <div className="flex gap-3 justify-start items-center p-1">
            <ContactListAvatar signedUrl={option.avatar} alt={option.label} />

            <div className="flex flex-col min-w-0">
                <span className="font-light text-xs truncate">{option.label}</span>
                {option.name && (<span className="text-[13px] text-gray-500 truncate">{option.name}</span>)}
                <span className="text-[12px] text-gray-400 truncate">
          &lt;{option.value}&gt;
        </span>
            </div>
        </div>
    );
}
