import React from 'react';
import {CheckCircle, Repeat2, Share2, Verified} from "lucide-react";
import {IdentityEntity, WorkspaceEntity} from "@db";
import {Button, Tooltip} from "@mantine/core";
import {
    FetchAdminWorkspaceIdentitiesResult,
} from "@/lib/actions/workspace";


function MarkDefaultDentity({workspace, userIdentity, workspaceUserIdentities}: {workspace: WorkspaceEntity, userIdentity: IdentityEntity, workspaceUserIdentities: FetchAdminWorkspaceIdentitiesResult}) {
    const userEmail = workspaceUserIdentities.find(wui => wui.workspace_identity_members.identityId === userIdentity.id)?.users?.email
    return <div className={"inline-flex mx-2"}>
        {userIdentity.id === workspace.defaultIdentityId  ? (
            <Button size={"compact-xs"} leftSection={<CheckCircle className="size-3.5" />}>Default</Button>
        ) : <div className={"text-xs flex gap-2 items-center justify-start"}>
            <Share2 size={16} />
            <Tooltip label={userEmail}>
                <span>Assigned to {userIdentity.displayName}</span>
            </Tooltip>
        </div>}

        {/*<ReusableFormButton*/}
        {/*    action={toggleDefaultIdentity}*/}
        {/*    buttonProps={{*/}
        {/*        size: "compact-xs",*/}
        {/*        variant: "outline",*/}
        {/*        leftSection: <CheckCircle className="size-3.5" />,*/}
        {/*        children: "Mark as Default",*/}
        {/*    }}*/}
        {/*    label={"Mark as Default"}*/}
        {/*>*/}
        {/*    <input type="hidden" name="identityId" value={userIdentity.id} />*/}
        {/*</ReusableFormButton>*/}
        {userIdentity.sharedWithWorkspace && <Tooltip label={"Default identities are shared with all members of the workspace"} withArrow>
            <div
                className={
                    "flex justify-center gap-1 items-center mx-2 text-brand-600 dark:text-brand-foreground font-medium text-xs"
                }
            >
                <Repeat2 size={16} />
                <span>Shared with workspace</span>
            </div>
        </Tooltip>}
    </div>
}

export default MarkDefaultDentity;
