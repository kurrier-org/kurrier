import { ContactRound } from "lucide-react";
import ContentPlaceholder from "@/components/common/content-placeholder";

export default function ContactSelectionPlaceholder({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<ContentPlaceholder
			icon={<ContactRound className="size-5" aria-hidden="true" />}
			title={title}
			description={description}
		/>
	);
}
