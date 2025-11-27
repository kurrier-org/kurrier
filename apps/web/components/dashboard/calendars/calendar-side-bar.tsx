"use client";

import React, { useEffect, useState } from "react";
import { Calendar, type DatePickerProps } from "@mantine/dates";
import dayjs from "dayjs";
import { setSidebarWidth } from "@/lib/utils";

function CalendarSideBar() {
    const [value, setValue] = useState<Date | null>(new Date());
    const today = dayjs();

    useEffect(() => {
        setSidebarWidth("300px");
        return () => setSidebarWidth("250px");
    }, []);

    const dayRenderer: DatePickerProps["renderDay"] = (date) => {
        const d = dayjs(date);
        const day = d.date();

        const isToday = d.isSame(today, "day");
        const isSelected = value ? d.isSame(value, "day") : false;
        const weekday = d.day();
        const isWeekend = weekday === 0 || weekday === 6;

        const classes = [
            "flex items-center justify-center w-7 h-7 rounded-md text-xs transition-colors",
            isSelected && "bg-brand text-white",
            !isSelected && isToday && "border border-brand-400 text-brand-700 bg-brand/5",
            !isSelected && !isToday && isWeekend && "text-brand-500 opacity-70 dark:text-brand-400",
            !isSelected && !isToday && !isWeekend && "text-slate-900 dark:text-slate-100 opacity-80",
        ]
            .filter(Boolean)
            .join(" ");

        return <div className={classes}>{day}</div>;
    };

    return <>
        <div className={"-my-2 pb-4 flex justify-center items-center bg-white dark:bg-neutral-800 p-2 border-b border-neutral-200 dark:border-neutral-700"}>
            <div className="flex justify-center">
                <div className="w-full">
                    {/*<div className="rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 p-2 dark:border-neutral-700 ">*/}
                    <div className="rounded-xl bg-white dark:bg-neutral-800 ">
                        <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-brand-foreground font-medium">
              Calendar
            </span>
                            <button
                                type="button"
                                onClick={() => setValue(new Date())}
                                className="text-xs font-medium text-brand-600"
                            >
                                Today
                            </button>
                        </div>

                        <Calendar
                            size="xs"
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
        </div>

    </>
}

export default CalendarSideBar;
