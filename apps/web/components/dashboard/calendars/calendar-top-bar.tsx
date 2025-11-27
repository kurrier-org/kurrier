"use client";
import React from 'react';
import {ActionIcon, Button, SegmentedControl} from "@mantine/core";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {useTheme} from "next-themes";
import {useAppearance} from "@/components/providers/appearance-provider";
import {useRouter} from "next/navigation";

function CalendarTopBar() {

    const {theme} =  useAppearance()
    const router = useRouter()

    return <>
        <div className={"flex p-2 justify-between w-full"}>
            <div className={"flex  gap-6"}>
                <Button size={"sm"} variant={"light"} className={"rounded-full"}>Today</Button>
                <div className={"flex gap-2 items-center"}>
                    <ActionIcon variant={"subtle"}>
                        <ChevronLeft size={24}/>
                    </ActionIcon>
                    <ActionIcon variant={"subtle"}>
                        <ChevronRight size={24}/>
                    </ActionIcon>
                </div>
                <div className={"flex justify-center items-center text-brand font-medium text-xl"}>
                    <h1>November 2025</h1>
                </div>
            </div>

            <div>
                <SegmentedControl radius={20} withItemsBorders={false} size={"sm"} onClick={() => {
                    router.push("/dashboard/calendar/day/1/2/3")
                }} color={theme} data={['Day', 'Week', 'Month', 'Year']} />

            </div>

        </div>
    </>
}

export default CalendarTopBar;
