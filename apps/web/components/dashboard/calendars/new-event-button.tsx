"use client";
import React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionIcon, Modal } from "@mantine/core";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { getDayjsTz } from "@common/day-js-extended";
import { CalendarState } from "@schema";
import { useDisclosure } from "@mantine/hooks";
import NewCalendarEventForm from "@/components/dashboard/calendars/new-calendar-event-form";

export default function NewEventButton({
	hideOnMobile,
}: {
	hideOnMobile?: boolean;
}) {
	const isMobile = useIsMobile();
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
						New Event
					</span>
				}
			>
				<NewCalendarEventForm start={start} end={end} onCompleted={close} />
			</Modal>

			{isMobile ? (
				<ActionIcon>
					<Link href={"/dashboard/contacts/new"}>
						<Plus className="h-4 w-4" />
					</Link>
				</ActionIcon>
			) : (
				<>
					<Button hidden={!hideOnMobile} size="lg" onClick={open}>
						<Plus className={"h-4 w-4"} />
						Create Event
					</Button>
				</>
			)}
		</>
	);
}
