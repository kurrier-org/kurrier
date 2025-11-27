"use client";
import React from "react";
import {WeekGrid} from "@/components/dashboard/calendars/week-view";

export default function CalendarShell({children}: { children: React.ReactNode }) {

    return (
        <main>
            <section>
                <WeekGrid />
            </section>
        </main>
    );
}
