"use client";
import { Button } from "@mantine/core";
import { ChevronRight, Cog } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

function IdentitySettingsLink({
	identityLabel,
	workspacePublicId,
}: {
	identityLabel?: string;
	workspacePublicId: string;
}) {
	const params = useParams();
	return (
		<Link
			href={`/w/${workspacePublicId}/dashboard/mail/${params.identityPublicId}/settings`}
		>
			<Button
				size={"sm"}
				className="!rounded-full px-2 sm:px-3"
				leftSection={<Cog size={20} />}
				variant={"light"}
				rightSection={<ChevronRight className="hidden sm:block" size={16} />}
			>
				<span className="hidden max-w-40 truncate font-medium sm:inline">
					{identityLabel}
				</span>
				<span className="sr-only sm:hidden">Settings</span>
			</Button>
		</Link>
	);
}

export default IdentitySettingsLink;
