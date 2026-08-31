"use client";
import { getDayjsTz } from "@common/day-js-extended";
import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { CalendarState } from "@schema";
import { Plus } from "lucide-react";
import NewCalendarEventForm from "@/components/dashboard/calendars/new-calendar-event-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Button } from "@/components/ui/button";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { cn } from "@/lib/utils";

export default function NewEventButton({
	compact = false,
	className,
}: {
	workspacePublicId: string;
	compact?: boolean;
	className?: string;
}) {
	const dict = useOptionalDictionary();
	const { state } = useDynamicContext<CalendarState>();

	const dayjsTz = getDayjsTz(state.defaultCalendar.timezone);
	const day = dayjsTz();
	const hour = day.minute() >= 30 ? day.hour() + 1 : day.hour();
	const start = day.hour(hour).minute(0).second(0).millisecond(0);
	const end = start.add(1, "hour");

	const [opened, { open, close }] = useDisclosure(false);

	return (
		<>
			<Modal
				size={"md"}
				opened={opened}
				onClose={close}
				title={
					<span className={"font-bold dark:text-brand-foreground text-brand"}>
						{dict?.calendar?.newEvent ?? "New Event"}
					</span>
				}
			>
				<NewCalendarEventForm start={start} end={end} onCompleted={close} />
			</Modal>

			<Button
				size={compact ? "icon" : "lg"}
				onClick={open}
				className={cn(!compact && "w-full", className)}
			>
				<Plus />
				<span className={compact ? "sr-only" : ""}>
					{dict?.calendar?.createEvent ?? "Create Event"}
				</span>
			</Button>
		</>
	);
}
