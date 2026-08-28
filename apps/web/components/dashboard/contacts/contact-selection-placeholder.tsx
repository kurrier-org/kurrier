import { ContactRound } from "lucide-react";
import DashboardEmptyState from "@/components/dashboard/dashboard-empty-state";

export default function ContactSelectionPlaceholder({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<DashboardEmptyState
			icon={<ContactRound className="size-5" aria-hidden="true" />}
			title={title}
			description={description}
		/>
	);
}
