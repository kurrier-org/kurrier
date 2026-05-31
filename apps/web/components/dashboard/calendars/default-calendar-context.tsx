"use client";
import React from 'react';
import {CalendarEntity} from "@db";
import {useDynamicContext} from "@/hooks/use-dynamic-context";
import type {CalendarState} from "@schema";

function DefaultCalendarContext({defaultCalendar, children}: {defaultCalendar: CalendarEntity, children: React.ReactNode}) {
    const { setState } = useDynamicContext<CalendarState>();

    React.useEffect(() => {
        setState((prev) => ({
            ...prev,
            defaultCalendar: defaultCalendar,
        }));
    }, [defaultCalendar, setState]);

    return children
}

export default DefaultCalendarContext;
