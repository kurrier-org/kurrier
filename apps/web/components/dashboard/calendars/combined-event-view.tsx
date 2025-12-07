import React from 'react';
import {CalendarEventEntity} from "@db";
import {Dayjs} from "dayjs";
import NewCalendarEventForm from "@/components/dashboard/calendars/new-calendar-event-form";
import {useDynamicContext} from "@/hooks/use-dynamic-context";
import {CalendarState} from "@schema";
import ExternalEventView from "@/components/dashboard/calendars/external-event-view";

function CombinedEventView({
                               newCalendarEventFormProps,
                           }: {
    newCalendarEventFormProps: {
        onCompleted: (data: CalendarEventEntity[]) => void;
        start: Dayjs;
        end: Dayjs;
    };
}) {
    const { state } = useDynamicContext<CalendarState>();

    return state?.activePopoverEditEvent?.isExternal ? (
        <ExternalEventView />
    ) : (
        <NewCalendarEventForm {...newCalendarEventFormProps} />
    );
}

export default CombinedEventView;
