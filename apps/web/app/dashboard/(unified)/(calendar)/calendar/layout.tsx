import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import CalendarTopBar from "@/components/dashboard/calendars/calendar-top-bar";
import {WeekGrid} from "@/components/dashboard/calendars/week-view";

export default async function ContactsLayout({ children }: { children: React.ReactNode }) {


	return (
		<>
            <header className="flex items-center gap-2 border-b  bg-background/60 backdrop-blur py-3 px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="data-[orientation=vertical]:h-4"
				/>
                <CalendarTopBar />
			</header>

            <main>
                <section className="flex flex-1 max-w-full flex-col border-r min-h-0">
                    <WeekGrid />
                </section>
            </main>

		</>
	);
}
