"use client";

import { Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCalendarPause } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { getVacationSettings } from "@/lib/actions/vacation";
import VacationSettingsForm from "./vacation-settings-form";

export default function VacationSettingsButton({
	identityId,
	email,
}: {
	identityId: string;
	email: string;
}) {
	const dict = useOptionalDictionary();
	const [loading, setLoading] = useState(false);
	async function open() {
		setLoading(true);
		try {
			const settings = (await getVacationSettings(identityId)) ?? {
				enabled: false,
				subject: dict?.platform?.vacationDefaultSubject ?? "Out of office",
				message: "",
				starts_at: null,
				ends_at: null,
			};
			const modalId = modals.open({
				title: (
					<div className="font-semibold text-brand-foreground">
						{dict?.platform?.vacationTitle ?? "Vacation reply"}
						<div className="mt-1 text-sm font-normal text-muted-foreground break-all">
							{email}
						</div>
					</div>
				),
				size: "lg",
				closeOnClickOutside: false,
				closeOnEscape: false,
				children: (
					<div className="p-2">
						<VacationSettingsForm
							identityId={identityId}
							settings={settings}
							onCompleted={() => {
								toast.success(
									dict?.platform?.vacationSaved ?? "Vacation settings saved",
								);
								modals.close(modalId);
							}}
						/>
					</div>
				),
			});
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: (dict?.platform?.vacationLoadError ?? "Could not load settings"),
			);
		} finally {
			setLoading(false);
		}
	}
	return (
		<Button
			size="xs"
			variant="default"
			className="flex-1 sm:flex-none"
			leftSection={<IconCalendarPause size={16} />}
			loading={loading}
			onClick={open}
		>
			{dict?.platform?.vacationTitle ?? "Vacation reply"}
		</Button>
	);
}
