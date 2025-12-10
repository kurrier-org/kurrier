"use client";

import React, { useMemo } from "react";
import { useDisclosure } from "@mantine/hooks";
import { Cog } from "lucide-react";
import { ActionIcon, Popover, Select } from "@mantine/core";
import { getTimeZones } from "@vvo/tzdb";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { CalendarState, BaseFormProps } from "@schema";
import { ReusableForm } from "@/components/common/reusable-form";
import { updateCalendarTimezone } from "@/lib/actions/calendar";

function CalendarSettings() {
	const { state } = useDynamicContext<CalendarState>();
	const [opened, { close, open }] = useDisclosure(false);

	const calendar = state?.defaultCalendar;
	if (!calendar) return null;

	const timezoneOptions = useMemo(
		() =>
			getTimeZones({ includeUtc: true }).map((tz) => {
				return {
					value: tz.name,
					label: `${tz.name} (${tz.abbreviation})`,
				};
			}),
		[],
	);

	const fields: BaseFormProps["fields"] = [
		{
			name: "calendarId",
			wrapperClasses: "hidden",
			props: {
				type: "hidden",
				value: calendar.id,
				readOnly: true,
			},
		},
		{
			name: "timezone",
			label: "Calendar time zone",
			kind: "custom",
			component: Select,
			wrapperClasses: "col-span-12",
			props: {
				data: timezoneOptions,
				searchable: true,
				allowDeselect: false,
				clearable: false,
				// defaultValue: calendar.timezone || "UTC",
				defaultValue: calendar.timezone
					? calendar.timezone === "UTC"
						? "Etc/UTC"
						: calendar.timezone
					: "UTC",
				nothingFoundMessage: "No timezones found",
			},
		},
	];

	return (
		<Popover
			opened={opened}
			onClose={close}
			width={280}
			withArrow
			shadow="md"
			position="bottom-start"
		>
			<Popover.Target>
				<ActionIcon
					variant="subtle"
					size="sm"
					aria-label="Calendar settings"
					onClick={open}
				>
					<Cog size={14} />
				</ActionIcon>
			</Popover.Target>

			<Popover.Dropdown>
				<ReusableForm
					action={updateCalendarTimezone}
					fields={fields}
					onSuccess={() => {
						close();
					}}
					submitButtonProps={{
						submitLabel: "Save",
						fullWidth: true,
						wrapperClasses: "mt-3",
					}}
				/>
			</Popover.Dropdown>
		</Popover>
	);
}

export default CalendarSettings;
