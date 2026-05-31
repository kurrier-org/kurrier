import React from 'react';
import {NavMain} from "@/components/nav-main";
import {getWorkspacePublicId, getWorkspaceRole} from "@/lib/actions/clients";

async function NavMainWrapper() {
    const [workspacePublicId, workspaceRole] = await Promise.all([
        getWorkspacePublicId(),
        getWorkspaceRole()
    ]);

    return <NavMain workspacePublicId={workspacePublicId} workspaceRole={workspaceRole || "member"} />
}

export default NavMainWrapper;
