import type {
    DistributionAccess,
    WorkspaceAccess,
} from "../access";

const fullWorkspaceAccess: WorkspaceAccess = {
    canUseWorkspace: true,
    canCreateProvider: true,
    canSyncMail: true,
    canCreateStorageVolume: true,
    reason: null,
};

export const DISTRIBUTION_ACCESS: DistributionAccess = {
    async workspace() {
        return fullWorkspaceAccess;
    },
};
