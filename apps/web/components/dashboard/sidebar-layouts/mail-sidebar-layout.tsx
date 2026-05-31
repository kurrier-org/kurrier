// import React from 'react';
// import {
//     fetchIdentityMailboxList,
//     fetchIdentitySnoozedThreads,
//     fetchMailboxUnreadCounts,
//     fetchScheduledDraftCounts
// } from "@/lib/actions/mailbox";
// import {fetchLabelsWithCounts} from "@/lib/actions/labels";
// import {getWorkspacePublicId} from "@/lib/actions/clients";
// import {isSignedIn} from "@/lib/actions/auth";
// import {fetchWorkspaceIdentities, fetchWorkspaces} from "@/lib/actions/workspace";
// import ComposeMail from "@/components/mailbox/default/compose-mail";
// import IdentityMailboxesList from "@/components/dashboard/identity-mailboxes-list";
// import {DynamicContextProvider} from "@/hooks/use-dynamic-context";
// import {getPublicEnv, LabelScope} from "@schema";
// import RenderLabelHomeSidebar from "@/components/dashboard/labels/render-label-home-sidebar";
// import {AppSidebar} from "@/components/ui/dashboards/unified/default/app-sidebar";
//
// async function MailSidebarLayout() {
//     const publicConfig = getPublicEnv();
//     const [
//         identityMailboxes,
//         unreadCounts,
//         // user,
//         globalLabels,
//         // scheduledDrafts,
//         // userWorkspaces,
//         workspacePublicId,
//         // memberIdentities,
//     ] = await Promise.all([
//         fetchIdentityMailboxList(),
//         fetchMailboxUnreadCounts(),
//         // isSignedIn(),
//         fetchLabelsWithCounts(),
//         // fetchScheduledDraftCounts(),
//         // fetchWorkspaces(),
//         getWorkspacePublicId(),
//         // fetchWorkspaceIdentities(),
//     ]);
//
//     const userPromise = isSignedIn()
//     const scheduledDraftsPromise = fetchScheduledDraftCounts()
//     const userWorkspacesPromise = fetchWorkspaces()
//     const snoozedThreadsPromise =
//         identityMailboxes[0]?.identity?.publicId
//             ? fetchIdentitySnoozedThreads(identityMailboxes[0].identity.publicId)
//             : Promise.resolve({ threads: [] });
//
//     const identityMailboxesPromise = fetchWorkspaceIdentities().then(
//         (memberIdentities) => {
//             const allowedIdentityIds = new Set(
//                 memberIdentities.map((mi) => mi.identityId)
//             );
//
//             return identityMailboxes.filter((im) => {
//                 const identity = im.identity;
//                 if (!identity) return false;
//                 if (identity.sharedWithWorkspace) return true;
//                 return allowedIdentityIds.has(identity.id);
//             });
//         }
//     );
//
//     return <>
//         <AppSidebar
//             publicConfig={publicConfig}
//             // user={user}
//             userPromise={userPromise}
//             // identityMailboxes={identityMailboxes}
//             // identityMailboxes={finalIdentityMailboxes}
//             // identityMailboxes={finalIdentityMailboxes}
//             identityMailboxesPromise={identityMailboxesPromise}
//             workspacePublicId={workspacePublicId}
//             sidebarTopContent={
//                 <div className={"-mt-1"} key={"mail-sidebar-compose"}>
//                     {identityMailboxes.length > 0 && (
//                         <ComposeMail publicConfig={publicConfig} />
//                     )}
//                 </div>
//             }
//             // userWorkspaces={userWorkspaces}
//             userWorkspacesPromise={userWorkspacesPromise}
//             sidebarSectionContent={
//                 <>
//                     <IdentityMailboxesList
//                         // identityMailboxes={identityMailboxes}
//                         identityMailboxesPromise={identityMailboxesPromise}
//                         // identityMailboxes={finalIdentityMailboxes}
//                         unreadCounts={unreadCounts}
//                         // scheduledDrafts={scheduledDrafts}
//                         scheduledDraftsPromise={scheduledDraftsPromise}
//                         // snoozedThreads={snoozedThreads}
//                         snoozedThreadsPromise={snoozedThreadsPromise}
//                         workspacePublicId={workspacePublicId}
//                     />
//                     <DynamicContextProvider
//                         initialState={{
//                             labels: globalLabels,
//                             scope: "thread" as LabelScope,
//                             workspacePublicId: workspacePublicId
//                         }}
//                     >
//                         <RenderLabelHomeSidebar identityMailboxesPromise={identityMailboxesPromise} />
//                         {/*{finalIdentityMailboxes.length > 0 && <LabelHome />}*/}
//                     </DynamicContextProvider>
//                 </>
//             }
//         />
//     </>
// }
//
// export default MailSidebarLayout;
