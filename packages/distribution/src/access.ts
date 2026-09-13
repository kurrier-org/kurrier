export type WorkspaceAccess = {
    canUseWorkspace: boolean;
    canCreateProvider: boolean;
    canSyncMail: boolean;
    canCreateStorageVolume: boolean;
    reason: string | null;
};

export type DistributionAccess = {
    workspace: (
        workspaceId: string,
    ) => Promise<WorkspaceAccess>;
};
