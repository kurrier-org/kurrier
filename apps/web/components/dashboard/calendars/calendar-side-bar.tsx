"use client";

import React, { useEffect, useState } from "react";
import { DatePicker, type DatePickerProps } from "@mantine/dates";
import dayjs, { Dayjs } from "dayjs";
import { setSidebarWidth } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { CalendarEntity } from "@db";

function CalendarSideBar({defaultCalendar}: {defaultCalendar: CalendarEntity}) {
    const today = dayjs();
    const params = useParams();
    const publicId = params.calendarPublicId || defaultCalendar?.publicId;
    const router = useRouter();

    const activeView = (params.view as string) || "week";

    const initialDay: Dayjs =
        params.year && params.month && params.day
            ? dayjs()
                .year(Number(params.year))
                .month(Number(params.month) - 1)
                .date(Number(params.day))
            : today;

    const [selected, setSelected] = useState<Dayjs | null>(initialDay);
    const [calendarDate, setCalendarDate] = useState<Date>(initialDay.toDate());

    useEffect(() => {
        setSidebarWidth("300px");
        return () => setSidebarWidth("250px");
    }, []);

    useEffect(() => {
        if (params.year && params.month && params.day) {
            const newValue = dayjs()
                .year(Number(params.year))
                .month(Number(params.month) - 1)
                .date(Number(params.day));

            setSelected(newValue);
            setCalendarDate(newValue.toDate());
        } else {
            setSelected(today);
            setCalendarDate(today.toDate());
        }
    }, [params.year, params.month, params.day, today]);

    const dayRenderer: DatePickerProps["renderDay"] = (date) => {
        const d = dayjs(date);
        const day = d.date();

        const isToday = d.isSame(today, "day");
        const isSelected = selected ? d.isSame(selected, "day") : false;
        const weekday = d.day();
        const isWeekend = weekday === 0 || weekday === 6;

        const classes = [
            "flex items-center justify-center w-7 h-7 rounded-md text-xs transition-colors duration-150",
            !isSelected &&
            isToday &&
            "border border-dashed border-brand text-brand bg-brand-100 dark:bg-brand-900 dark:border-brand-400 dark:text-brand-300",
            !isSelected &&
            !isToday &&
            isWeekend &&
            "text-brand-500 opacity-70 dark:text-brand-400",
        ]
            .filter(Boolean)
            .join(" ");

        return <div className={classes}>{day}</div>;
    };

    const onChange = (value: string | null) => {
        if (!value) {
            setSelected(null);
            return;
        }

        const newDay = dayjs(value);
        if (newDay.isSame(dayjs(), "day")) {
            setSelected(today);
            setCalendarDate(today.toDate());
            router.push("/dashboard/calendar");
            return;
        }

        setSelected(newDay);
        setCalendarDate(newDay.toDate());

        const year = newDay.year();
        const month = newDay.month() + 1;
        const day = newDay.date();

        router.push(`/dashboard/calendar/${publicId}/${activeView}/${year}/${month}/${day}`);
    };

    return (
        <div className="-my-2 pb-4 flex justify-center items-center bg-white dark:bg-neutral-800 p-2 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-center w-full">
                <div className="w-full rounded-xl bg-white dark:bg-neutral-800">
                    <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-brand-foreground font-medium">
              Calendar
            </span>
                        <button
                            type="button"
                            className="text-xs font-medium text-brand-600"
                            onClick={() => {
                                setSelected(today);
                                setCalendarDate(today.toDate());
                                router.push(`/dashboard/calendar`);
                            }}
                        >
                            Today
                        </button>
                    </div>

                    <DatePicker
                        size="xs"
                        value={selected ? selected.toDate() : null}
                        onChange={onChange}
                        date={calendarDate}
                        onDateChange={(d) => {
                            if (!d) return;
                            setCalendarDate(dayjs(d).toDate())
                        }}
                        renderDay={dayRenderer}
                        classNames={{
                            calendarHeader: "px-2 pt-1 pb-1",
                            calendarHeaderLevel: "text-sm font-semibold",
                            weekday: "text-sm font-medium text-slate-500",
                            month: "space-y-2",
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default CalendarSideBar;
