"use client";
import React, {useEffect} from 'react';
import {ActionIcon, Button, SegmentedControl} from "@mantine/core";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {useAppearance} from "@/components/providers/appearance-provider";
import {useParams, useRouter} from "next/navigation";
import {useDynamicContext} from "@/hooks/use-dynamic-context";
import dayjs from "dayjs";
import {CalendarState, calendarViewsList, CalendarViewType} from "@schema";

function CalendarTopBar() {

    const {theme} =  useAppearance()
    const router = useRouter()
    const { setState } = useDynamicContext()
    const {view} = useParams()
    const params = useParams()
    const activeView = view ?? "week"

    useEffect(() => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setState(prev => ({
            ...prev,
            userTz: prev.userTz ?? tz
        }));
    }, [setState]);


    const currentDay =
        params.year && params.month && params.day
            ? dayjs()
                .year(Number(params.year))
                .month(Number(params.month) - 1)
                .date(Number(params.day))
            :  dayjs();

    let currentViewTitle = ""
    if (activeView === "week") {
        currentViewTitle = currentDay.format("MMMM YYYY")
    } else if (activeView === "month") {
        currentViewTitle = currentDay.format("MMMM YYYY")
    } else if (activeView === "year") {
        currentViewTitle = currentDay.format("YYYY")
    } else {
        currentViewTitle = currentDay.format("DD MMMM YYYY")
    }

    const switchView = async (value: CalendarViewType) => {
        // setState((prev: any) => ({ ...prev,  activeView: value }));
        // router.push("/dashboard/calendar/day/1/2/3")
    };

    const shiftCurrentDay = (direction: 1 | -1) => {
        const base = currentDay ?? dayjs();
        let next = base;

        if (activeView === "day") next = base.add(direction, "day");
        else if (activeView === "week") next = base.add(direction, "week");
        else if (activeView === "month") next = base.add(direction, "month");
        else if (activeView === "year") next = base.add(direction, "year");

        const year = next.year();
        const month = next.month() + 1; // 1-based
        const day = next.date();

        if (next.isSame(dayjs(), "day")) {
            router.push(`/dashboard/calendar`);
        } else {
            router.push(`/dashboard/calendar/${activeView}/${year}/${month}/${day}`);
        }
    };

    const prev = () => shiftCurrentDay(-1);
    const next = () => shiftCurrentDay(1);

    const goToToday = () => {
        setState((prev: CalendarState) => ({
            ...prev,
            currentDay: dayjs(),
        }));
        if(activeView === "week") {
            router.push(`/dashboard/calendar`);
        } else {
            router.push(`/dashboard/calendar/${activeView}`);
        }

    };

    return <>
        <div className={"flex p-2 justify-between w-full"}>
            <div className={"flex  gap-6"}>
                <Button onClick={goToToday} size={"sm"} variant={"light"} className={"rounded-full"}>Today</Button>
                <div className={"flex gap-2 items-center"}>
                    <ActionIcon variant={"subtle"} onClick={prev}>
                        <ChevronLeft size={24}/>
                    </ActionIcon>
                    <ActionIcon variant={"subtle"} onClick={next}>
                        <ChevronRight size={24}/>
                    </ActionIcon>
                </div>
                <div className={"flex justify-center items-center text-brand dark:text-brand-foreground font-medium text-2xl"}>
                    <h1>{currentViewTitle}</h1>
                </div>
            </div>

            <div>
                <SegmentedControl onChange={switchView}
                                  radius={20} withItemsBorders={false}
                                  size={"sm"} value={String(activeView)} color={theme} data={calendarViewsList.map((item) => {
                    return { label: <span className={"capitalize"}>{item}</span>, value: item }
                })} />

            </div>

        </div>
    </>
}

export default CalendarTopBar;
