"use client";

import React, { useState } from "react";
import { DateTimePicker } from "@mantine/dates";
import { ReusableForm } from "@/components/common/reusable-form";
import {BaseFormProps, CalendarOrganizerType, CalendarState} from "@schema";
import {
	deleteCalendarEvent,
	upsertCalendarEvent,
} from "@/lib/actions/calendar";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { Dayjs } from "dayjs";
import {ActionIcon, Alert, Checkbox, Divider, FocusTrap, Select} from "@mantine/core";
import { CalendarEventEntity } from "@db";
import { Trash } from "lucide-react";
import { getDayjsTz, getWallTimeDate } from "@common/day-js-extended";
import { IconAlertCircle } from "@tabler/icons-react";
import {usePathname} from "next/navigation";
import AddGuests from "@/components/dashboard/calendars/add-guests";

type NewCalendarEventFormProps = {
	onCompleted: (data: CalendarEventEntity[]) => void;
	start: Dayjs;
	end: Dayjs;
};

function NewCalendarEventForm({
	onCompleted,
	start,
	end,
}: NewCalendarEventFormProps) {
	const { state } = useDynamicContext<CalendarState>();
	const dayjsTz = getDayjsTz(state.defaultCalendar.timezone);
	const editEvent = state.activePopoverEditEvent;
    const [selectedOrganizer, setSelectedOrganizer] = useState<CalendarOrganizerType | null>(state.organizers[0] ? state.organizers[0] : null);
    const pathname = usePathname()

	const fields: BaseFormProps["fields"] = [
		{
			name: "calendarId",
			wrapperClasses: "hidden",
			props: {
				type: "hidden",
				value: state?.defaultCalendar?.id,
				readOnly: true,
			},
		},
		{
			name: "eventId",
			wrapperClasses: "hidden",
			props: { type: "hidden", defaultValue: editEvent?.id, readOnly: true },
		},
        {
            name: "pathname",
            wrapperClasses: "hidden",
            props: { type: "hidden", defaultValue: pathname, readOnly: true },
        },
		{
			name: "tz",
			wrapperClasses: "hidden",
			props: {
				type: "hidden",
				value: state?.defaultCalendar?.timezone,
				readOnly: true,
			},
		},
		{
			name: "title",
			label: "Title",
			wrapperClasses: "col-span-12",
			props: {
				required: true,
				placeholder: "Event title",
				autoComplete: "off",
				defaultValue: editEvent?.title,
			},
		},
		{
			name: "startsAt",
			label: "Start",
			kind: "custom",
			component: DateTimePicker,
			wrapperClasses: "col-span-6",
			props: {
				required: true,
				className: "w-full",
				format: "12h",
				valueFormat: "DD MMM hh:mm A",
				timePickerProps: {
					minutesStep: 15,
				},
				defaultValue: editEvent?.startsAt
					? getWallTimeDate(dayjsTz(editEvent?.startsAt))
					: getWallTimeDate(start),
			},
		},
		{
			name: "endsAt",
			label: "End",
			kind: "custom",
			component: DateTimePicker,
			wrapperClasses: "col-span-6",
			props: {
				required: true,
				className: "w-full",
				format: "12h",
				valueFormat: "DD MMM hh:mm A",
				timePickerProps: {
					minutesStep: 15,
				},
				defaultValue: editEvent?.endsAt
					? getWallTimeDate(dayjsTz(editEvent?.endsAt))
					: getWallTimeDate(end),
			},
		},
		{
			el: <AddGuests name={"attendees"} />,
		},
		{
			name: "organizerIdentityId",
			label: "Organizer",
			kind: "custom",
			component: Select,
			wrapperClasses: "col-span-12",
			props: {
				data: state.organizers,
				allowDeselect: false,
				required: true,
				value: selectedOrganizer?.value,
                onChange: (val: string | null) => {
                    const organizer = state.organizers.find((org) => org.value === val);
                    setSelectedOrganizer(organizer || null);
                }
			},
		},
        ...(selectedOrganizer && !selectedOrganizer.displayName
            ? [
                {
                    name: "newOrganizerName",
                    label: "Organizer name",
                    wrapperClasses: "col-span-12",
                    bottomStartPrefix: <span className={"text-xxs"}>This name will be shown in calendar invites and saved for this email identity.</span>,
                    props: {
                        required: true,
                        placeholder: "e.g. John Doe",
                        autoComplete: "off",
                    },
                } as const,
            ]
            : []),
		{
			name: "description",
			label: "Description",
			kind: "textarea",
			wrapperClasses: "col-span-12",
			props: {
				autoComplete: "off",
				defaultValue: editEvent?.description,
			},
		},
        {
            name: "notifyAttendees",
            label: "Notify attendees",
            kind: "custom",
            component: Checkbox,
            wrapperClasses: "col-span-12",
            props: {
                defaultChecked: false,
                label: <div className={"text-sm -mt-0.5"}>Send email notifications</div>,
                size: "xs",
            }
        },
	];

	return (
		<>
            <FocusTrap active={true}>
                {editEvent && (
                    <>
                        <div className={`flex justify-between items-center capitalize`}>
                            <h1 className={"text-lg font-semibold"}>{editEvent?.title}</h1>
                            <ActionIcon
                                type={"button"}
                                size={"md"}
                                variant={"light"}
                                color={"red"}
                                onClick={() =>
                                    deleteCalendarEvent(editEvent.id).then(() => {
                                        onCompleted([]);
                                    })
                                }
                            >
                                <Trash size={12} />
                            </ActionIcon>
                        </div>

                        <Divider my={"sm"} variant={"dashed"} />
                    </>
                )}

                {state.organizers.length === 0 ? (
                    <>
                        <Alert icon={<IconAlertCircle />} variant={"filled"}>
                            No organizers(Email Identities) found. <br /> Please add atleast one
                            email identity to create calendar events.
                        </Alert>
                    </>
                ) : (
                    <ReusableForm
                        action={upsertCalendarEvent}
                        fields={fields}
                        onSuccess={onCompleted}
                        submitButtonProps={{
                            submitLabel: editEvent ? "Update event" : "Create event",
                            wrapperClasses: "mt-4",
                            fullWidth: true,
                        }}
                    />
                )}
            </FocusTrap>

		</>
	);
}

export default NewCalendarEventForm;
