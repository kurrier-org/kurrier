"use client";

import React from "react";
import { DateTimePicker } from "@mantine/dates";
import { ReusableForm } from "@/components/common/reusable-form";
import type {BaseFormProps, CalendarState} from "@schema";
import {createCalendarEvent} from "@/lib/actions/calendar";
import {useDynamicContext} from "@/hooks/use-dynamic-context";

type NewCalendarEventFormProps = {
    calendarId: string;
    defaultStartsAt?: Date | string;
    onCompleted?: () => void;
};

function NewCalendarEventForm({ defaultStartsAt, onCompleted}: NewCalendarEventFormProps) {

    const { state } = useDynamicContext<CalendarState>()

    const fields: BaseFormProps["fields"] = [
        {
            name: "calendarId",
            wrapperClasses: "hidden",
            props: { type: "hidden", value: state?.defaultCalendar?.id, readOnly: true },
        },
        {
            name: "title",
            label: "Title",
            wrapperClasses: "col-span-12",
            props: {
                required: true,
                placeholder: "Event title",
                autoComplete: "off",
            },
        },
        {
            name: "startsAt",
            label: "Date & time",
            kind: "custom",
            component: DateTimePicker,
            wrapperClasses: "col-span-12",
            props: {
                required: true,
                className: "w-full",
                // force a predictable string so the server can parse it
                valueFormat: "YYYY-MM-DD HH:mm",
                // optional initial value
                defaultValue: defaultStartsAt ?? new Date(),
            },
        },
    ];

    return (
        <ReusableForm
            action={createCalendarEvent}
            fields={fields}
            onSuccess={onCompleted}
            submitButtonProps={{
                submitLabel: "Create event",
                wrapperClasses: "mt-4",
                fullWidth: true,
            }}
        />
    );
}

export default NewCalendarEventForm;
