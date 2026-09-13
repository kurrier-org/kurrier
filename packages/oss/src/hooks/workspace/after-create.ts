export const logWorkspaceCreated = async ({
                                              userId,
                                              workspaceId,
                                          }: {
    userId: string;
    workspaceId: string;
}) => {
    console.info(
        "[oss] workspace.afterCreate",
        { userId, workspaceId },
    );
};
