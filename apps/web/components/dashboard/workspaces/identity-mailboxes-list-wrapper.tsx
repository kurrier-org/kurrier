import {
    fetchIdentityMailboxList,
    fetchIdentitySnoozedThreads,
    fetchMailboxUnreadCounts,
    fetchScheduledDraftCounts
} from "@/lib/actions/mailbox";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {fetchLabelsWithCounts} from "@/lib/actions/labels";
import IdentityMailboxesList from "@/components/dashboard/identity-mailboxes-list";
import {DynamicContextProvider} from "@/hooks/use-dynamic-context";
import {LabelScope} from "@schema";
import RenderLabelHomeSidebar from "@/components/dashboard/labels/render-label-home-sidebar";

async function IdentityMailboxesListWrapper() {


    const [
        identityMailboxes,
        unreadCounts,
        globalLabels,
        workspacePublicId
    ] = await Promise.all([
        fetchIdentityMailboxList(),
        fetchMailboxUnreadCounts(),
        fetchLabelsWithCounts(),
        getWorkspacePublicId()
    ]);

    const scheduledDraftsPromise = fetchScheduledDraftCounts();
    const snoozedThreadsPromise = fetchIdentitySnoozedThreads()

    return (
        <>
            <IdentityMailboxesList
                identityMailboxes={identityMailboxes}
                unreadCounts={unreadCounts}
                scheduledDraftsPromise={scheduledDraftsPromise}
                snoozedThreadsPromise={snoozedThreadsPromise}
                workspacePublicId={workspacePublicId}
            />

            <DynamicContextProvider
                initialState={{
                    labels: [],
                    scope: "thread" as LabelScope,
                    workspacePublicId,
                }}
            >
                <RenderLabelHomeSidebar globalLabels={globalLabels}/>
            </DynamicContextProvider>
        </>
    );


}

export default IdentityMailboxesListWrapper;
