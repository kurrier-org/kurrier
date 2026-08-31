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
			className="shrink-0"
			href={`/w/${workspacePublicId}/dashboard/mail/${params.identityPublicId}/settings`}
		>
			<Button
				size="sm"
				className="!size-11 !min-w-11 !rounded-full !p-0 md:!h-9 md:!w-auto md:!min-w-0 md:!px-3"
				variant="light"
				aria-label={identityLabel ? `Settings: ${identityLabel}` : "Settings"}
			>
				<span className="flex min-w-0 items-center justify-center gap-2">
					<Cog className="shrink-0" size={20} />
					<span className="hidden max-w-40 truncate font-medium md:inline">
						{identityLabel}
					</span>
					<ChevronRight className="hidden shrink-0 md:block" size={16} />
				</span>
			</Button>
		</Link>
	);
}

export default IdentitySettingsLink;
