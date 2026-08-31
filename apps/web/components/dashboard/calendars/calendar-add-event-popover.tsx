"use client";
import { Popover } from "@mantine/core";
import type { Dayjs } from "dayjs";
import { useParams } from "next/navigation";
import type React from "react";
import { toast } from "sonner";
import CombinedEventView from "@/components/dashboard/calendars/combined-event-view";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
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
	const dict = useOptionalDictionary();
	const { view } = useParams();
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

			<Popover.Dropdown className="h-96 w-[min(28rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-auto rounded-xl border border-border bg-popover p-3 shadow-lg">
				<CombinedEventView
					newCalendarEventFormProps={{
						start,
						end,
						onCompleted: (
							_data,
							{ showToast }: { showToast?: boolean } = {},
						) => {
							if (showToast ?? true) {
								toast.success(dict?.common?.success ?? "Success");
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
