import React from 'react';
import ScheduledList from "@/components/mailbox/default/scheduled-list";
import {fetchScheduledDrafts} from "@/lib/actions/mailbox";

async function Page() {
    const scheduledDrafts = await fetchScheduledDrafts()
    return <>

        <div className="p-4">
            <ul role="list" className="divide-y rounded-4xl">
                <ScheduledList drafts={scheduledDrafts} />
            </ul>
        </div>


    </>
}

export default Page;
