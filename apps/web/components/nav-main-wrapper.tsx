import React from "react";
import { kurrierWeb } from "@distribution/kurrier-web";
import { NavMain } from "@/components/nav-main";
import {
    getWorkspacePublicId,
    getWorkspaceRole,
} from "@/lib/actions/clients";

async function NavMainWrapper() {
    const [workspacePublicId, workspaceRole] = await Promise.all([
        getWorkspacePublicId(),
        getWorkspaceRole(),
    ]);

    const extensionNavItems = kurrierWeb.navigation.dashboard();

    return (
        <NavMain
            workspacePublicId={workspacePublicId}
            workspaceRole={workspaceRole || "member"}
            extensionNavItems={extensionNavItems}
        />
    );
}

export default NavMainWrapper;
