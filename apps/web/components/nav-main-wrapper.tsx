import React from 'react';
import {NavMain} from "@/components/nav-main";
import {getWorkspacePublicId, getWorkspaceRole} from "@/lib/actions/clients";
import { getDashboardNavigation } from "@extensions";
import { registerDistribution } from "@distribution";

async function NavMainWrapper() {
    registerDistribution();
    const [workspacePublicId, workspaceRole] = await Promise.all([
        getWorkspacePublicId(),
        getWorkspaceRole()
    ]);

    const extensionNavItems = getDashboardNavigation();

    return <NavMain workspacePublicId={workspacePublicId} workspaceRole={workspaceRole || "member"}	extensionNavItems={extensionNavItems} />
}

export default NavMainWrapper;
