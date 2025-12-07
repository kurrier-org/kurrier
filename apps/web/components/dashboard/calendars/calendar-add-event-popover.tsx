"use client";
import React from "react";
import { Popover } from "@mantine/core";
import { Dayjs } from "dayjs";
import CombinedEventView from "@/components/dashboard/calendars/combined-event-view";
import {toast} from "sonner";


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


    return (
		<Popover
			opened={opened}
			onChange={onChange}
			withinPortal
			position="left"
			withArrow
			closeOnClickOutside={false}
			closeOnEscape={true}
			arrowOffset={24}
			trapFocus={true}
			shadow={"xl"}
			radius={"md"}
		>
			<Popover.Target>{children}</Popover.Target>

			<Popover.Dropdown className="min-w-sm bg-popover border border-border rounded-xl p-3 shadow-lg">
                <CombinedEventView newCalendarEventFormProps={{ start, end, onCompleted: () => {
                        toast.success("Success");
                        onChange(false);
                    }
                }} />
			</Popover.Dropdown>
		</Popover>
	);
}

export default CalendarAddEventPopover;
