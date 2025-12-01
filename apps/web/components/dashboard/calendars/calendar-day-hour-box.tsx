"use client";
import React from "react";
import { Dayjs } from "dayjs";
import CalendarBoxIndicatorLayer from "@/components/dashboard/calendars/calendar-box-indicator-layer";
import CalendarBoxEventsLayer from "@/components/dashboard/calendars/calendar-box-events-layer";

function CalendarDayHourBox({ day, hour}: { day: Dayjs; hour: number; }) {

    const start = day
        .hour(hour)
        .minute(0)
        .second(0)
        .millisecond(0);

    const end = start.add(1, "hour");

    return <>
        <div
            className="h-12 border-b border-neutral-200 dark:border-neutral-700 cursor-pointer relative z-10"
            data-start-iso={start.toISOString()}
            data-end-iso={end.toISOString()}
        >
            <CalendarBoxIndicatorLayer start={start} end={end} />
            <CalendarBoxEventsLayer />
        </div>
    </>
}

export default CalendarDayHourBox;
