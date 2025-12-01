import React from 'react';
import CalendarAddEventPopover from "@/components/dashboard/calendars/calendar-add-event-popover";
import {useDisclosure} from "@mantine/hooks";

function CalendarBoxEventsLayer() {
    const [opened, { toggle, close }] = useDisclosure(false);
    const name = async (ev: any) => {
        ev.preventDefault();
        ev.stopPropagation();
        close()
        console.log("yay")

    };

    return <>
        <CalendarAddEventPopover
            opened={opened}
            toggle={toggle}
        >
            <div className={"absolute w-full h-full"} onClick={toggle}>

                <span onClick={name}>CalendarBoxEvents</span>
            </div>
        </CalendarAddEventPopover>
    </>
}

export default CalendarBoxEventsLayer;
