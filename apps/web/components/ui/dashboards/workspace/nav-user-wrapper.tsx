import React from 'react';
import {NavUser} from "@/components/ui/dashboards/workspace/nav-user";
import {isSignedIn} from "@/lib/actions/auth";
import {getWorkspacePublicId} from "@/lib/actions/clients";
import {fetchWorkspaces} from "@/lib/actions/workspace";

async function NavUserWrapper() {
    const user = await isSignedIn()
    const workspacePublicId = await getWorkspacePublicId()
    const userWorkspaces = await fetchWorkspaces()

    return <NavUser workspacePublicId={workspacePublicId} user={user} userWorkspaces={userWorkspaces} />
}

export default NavUserWrapper;
