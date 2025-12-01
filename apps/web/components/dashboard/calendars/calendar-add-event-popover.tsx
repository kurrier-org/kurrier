"use client";

import React from "react";
import { Popover, TextInput, ScrollArea } from "@mantine/core";
import NewCalendarEventForm from "@/components/dashboard/calendars/new-calendar-event-form";


function CalendarAddEventPopover({children, opened, toggle}: { children?: React.ReactNode, opened: boolean, toggle: () => void }) {

    return (
        <Popover
            opened={opened}
            onChange={toggle}
            withinPortal
            position="left"
            withArrow
            // zIndex={200}
            // offset={12}
            // arrowPosition={"side"}
            // arrowSize={20}
            arrowOffset={24}
            trapFocus={true}
            shadow={"xl"}
            radius={"md"}
        >
            <Popover.Target>
                {children}
            </Popover.Target>

            <Popover.Dropdown className="min-w-sm bg-popover border border-border rounded-xl p-3 shadow-lg">
                <NewCalendarEventForm />
            </Popover.Dropdown>
        </Popover>
    );
}

export default CalendarAddEventPopover;
