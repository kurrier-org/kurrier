export type HookMap = {
    "workspace.beforeCreate": {
        userId: string;
    };

    "workspace.afterCreate": {
        userId: string;
        workspaceId: string;
    };
};

export type HookName = keyof HookMap;

export type HookHandler<K extends HookName> = (
    context: HookMap[K],
) => void | Promise<void>;
