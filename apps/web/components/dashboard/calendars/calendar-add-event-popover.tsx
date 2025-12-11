"use client";
import React from "react";
import { Popover } from "@mantine/core";
import { Dayjs } from "dayjs";
import CombinedEventView from "@/components/dashboard/calendars/combined-event-view";
import { toast } from "sonner";
import {useParams} from "next/navigation";
export type OnCompletedOptions = {
	showToast?: boolean;
};

function CalendarAddEventPopover({
	children,
	opened,
	onChange,
	start,
	end,
}: {
	children?: React.ReactNode;
	opened: boolean;
	start: Dayjs;
	end: Dayjs;
	onChange: (open: boolean) => void;
}) {
    const {view} = useParams()
	return (
		<Popover
			opened={opened}
			onChange={onChange}
			trapFocus={true}
			withinPortal
			position={view === "day" ? "bottom" : "left"}
			withArrow
			closeOnClickOutside={false}
			closeOnEscape={true}
			arrowOffset={24}
			shadow={"xl"}
			radius={"md"}
		>
			<Popover.Target>{children}</Popover.Target>

			<Popover.Dropdown className="min-w-md max-w-md bg-popover border border-border rounded-xl p-3 shadow-lg">
				<CombinedEventView
					newCalendarEventFormProps={{
						start,
						end,
						onCompleted: (
							_data,
							{ showToast }: { showToast?: boolean } = {},
						) => {
							if (showToast ?? true) {
								toast.success("Success");
							}
							onChange(false);
						},
					}}
				/>
			</Popover.Dropdown>
		</Popover>
	);
}

export default CalendarAddEventPopover;
