"use client";

import React, { useMemo, useState, useTransition } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { CalendarState } from "@schema";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import GuestList from "@/components/dashboard/calendars/guest-list";
import {Button} from "@mantine/core";
import {Check, CheckCircle, CircleDashed, CircleX} from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);

type UiGuestStatus = "accepted" | "declined" | "tentative" | "needs_action" | null;

type ExternalEventViewProps = {
    onRespond?: (status: Exclude<UiGuestStatus, null>) => Promise<void> | void;
};

function ExternalEventView({ onRespond }: ExternalEventViewProps) {
    const { state } = useDynamicContext<CalendarState>();
    const [isPending, startTransition] = useTransition();

    const editEvent = state.activePopoverEditEvent ?? null;
    const editEventId = editEvent?.id ?? null;

    const attendeesRaw = (editEventId && state.calendarEventAttendees?.[editEventId]) || [];
    const attendeeContacts = state.attendeeContacts ?? [];

    const contactsById = useMemo(() => {
        const map = new Map<string, any>();
        attendeeContacts.forEach((c: any) => {
            if (c.id) map.set(c.id, c);
        });
        return map;
    }, [attendeeContacts]);

    const contactsByEmail = useMemo(() => {
        const map = new Map<string, any>();
        attendeeContacts.forEach((c: any) => {
            if (c.email) {
                const e = String(c.email).trim().toLowerCase();
                if (e) map.set(e, c);
            }
        });
        return map;
    }, [attendeeContacts]);

    const guests = useMemo(
        () =>
            attendeesRaw.map((a: any) => {
                const email = String(a.email ?? "").trim().toLowerCase();
                const contactId = a.contactId ?? null;

                const contactFromId = contactId ? contactsById.get(contactId) : null;
                const contactFromEmail = email ? contactsByEmail.get(email) : null;
                const contact = contactFromId || contactFromEmail || null;

                return {
                    email,
                    name: contact?.name ?? a.name ?? null,
                    avatar: contact?.avatar ?? a.avatar ?? null,
                    contactId: contact?.id ?? contactId ?? null,
                    isOrganizer: a.isOrganizer ?? false,
                    isPersisted: true,
                    partstat: (a.partstat as UiGuestStatus) ?? "needs_action",
                };
            }),
        [attendeesRaw, contactsById, contactsByEmail],
    );

    const myEmails = useMemo(() => {
        const set = new Set<string>();

        (state.organizers ?? []).forEach((org: any) => {
            if (org.email) {
                const e = String(org.email).trim().toLowerCase();
                if (e) set.add(e);
            }

            if (typeof org.value === "string" && org.value.includes("@")) {
                const e = org.value.trim().toLowerCase();
                if (e) set.add(e);
            }

            if (typeof org.label === "string") {
                const match = org.label.match(/<([^>]+)>/);
                if (match?.[1]) {
                    const e = match[1].trim().toLowerCase();
                    if (e) set.add(e);
                }
            }
        });

        return set;
    }, [state.organizers]);

    const selfAttendee =
        useMemo(
            () =>
                guests.find((g) => myEmails.has(g.email.trim().toLowerCase())) ?? null,
            [guests, myEmails],
        ) ?? null;

    const selfStatus: UiGuestStatus =
        (selfAttendee?.partstat as UiGuestStatus) ?? "needs_action";

    const [localStatus, setLocalStatus] = useState<UiGuestStatus>(selfStatus);
    const effectiveStatus: UiGuestStatus = localStatus ?? selfStatus;

    const userTz = state.userTz || state.calendarTzName || "UTC";

    const start = editEvent ? dayjs(editEvent.startsAt).tz(userTz) : null;
    const end = editEvent ? dayjs(editEvent.endsAt).tz(userTz) : null;

    const dateLabel =
        start && end
            ? `${start.format("ddd, D MMM")} · ${start.format(
                "hh:mm A",
            )} – ${end.format("hh:mm A")} (${start.format("z")})`
            : "";

    const organizerLabel =
        editEvent?.organizerName && editEvent?.organizerEmail
            ? `${editEvent.organizerName} <${editEvent.organizerEmail}>`
            : editEvent?.organizerEmail || "";

    const handleClick = (status: Exclude<UiGuestStatus, null>) => {
        setLocalStatus(status);

        if (!onRespond) return;

        startTransition(() => {
            void onRespond(status);
        });
    };


    return (
        <div className="max-w-sm max-h-xl overflow-y-auto rounded-2xl bg-muted/40 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold leading-snug">
                        {editEvent?.title || "(no title)"}
                    </div>
                    {dateLabel && (
                        <div className="text-xs text-muted-foreground">{dateLabel}</div>
                    )}
                </div>
                {/*<span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">*/}
                {/*    Invitation*/}
                {/*</span>*/}
            </div>

            <div className={"flex gap-2 my-4 bg-brand/10 p-2 rounded-sm"}>
                <Button size={"compact-xs"} disabled={isPending} variant={"filled"} leftSection={<CheckCircle size={12} />}>Accept</Button>
                <Button size={"compact-xs"} disabled={isPending} variant={'subtle'} leftSection={<CircleDashed size={12} />}>Maybe</Button>
                <Button size={"compact-xs"} disabled={isPending} variant={"subtle"} leftSection={<CircleX size={12} />}>Decline</Button>
            </div>

            {organizerLabel && (
                <div className="mt-3 rounded-xl bg-muted/70 px-3 py-2 text-xs">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Organizer
                    </div>
                    <div className="mt-0.5 font-medium">{organizerLabel}</div>
                </div>
            )}

            {editEvent?.location && (
                <div className="mt-2 rounded-xl bg-muted/70 px-3 py-2 text-xs">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Location
                    </div>
                    <div className="mt-0.5 font-medium">{editEvent.location}</div>
                </div>
            )}

            {editEvent?.description && editEvent.description.trim().length > 0 && (
                <div className="mt-2 rounded-xl bg-muted/70 px-3 py-2 text-xs">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Description
                    </div>
                    <div className="mt-0.5 whitespace-pre-wrap break-words text-[13px]">
                        {editEvent.description}
                    </div>
                </div>
            )}

            {guests.length > 0 && (
                <div className="mt-2 rounded-xl bg-muted/40 px-3 py-2">
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Guests
                    </div>
                    <GuestList guests={guests} />
                </div>
            )}

        </div>
    );
}

export default ExternalEventView;
