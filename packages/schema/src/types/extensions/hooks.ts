export type HookMap = {
    "workspace.beforeCreate": {
        userId: string;
    };

    "identity.beforeCreate": {
        workspaceId: string;
    };

    "mail.beforeSend": {
        workspaceId: string;
        identityId: string;
    };

    "mail.beforeSync": {
        workspaceId: string;
        identityId: string;
    };

    "storage.beforeUpload": {
        workspaceId: string;
        bytes: number;
    };
};

export type HookName = keyof HookMap;

export type HookHandler<K extends HookName> = (
    context: HookMap[K],
) => void | Promise<void>;
