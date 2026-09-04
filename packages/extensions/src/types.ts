import type { HookHandler, HookName } from "@schema";

export type ExtensionCompatibility = {
    kurrier?: string;
};

export type ExtensionManifest = {
    id: string;
    name: string;
    compatibility?: ExtensionCompatibility;
};

export type ExtensionHooks = {
    [K in HookName]?: HookHandler<K>;
};

export type KurrierExtension<TComponent = unknown> = {
    manifest: ExtensionManifest;
    hooks?: ExtensionHooks;
    contributions?: ExtensionContributions<TComponent>;
};

export type DashboardNavItem = {
    id: string;
    title: string;
    path: string;
    icon?: string;
    ownerOnly?: boolean;
};

export type ExtensionContributions<TComponent = unknown> = {
    navigation?: {
        dashboard?: DashboardNavItem[];
    };
    pages?: {
        dashboard?: ExtensionPage<TComponent>[];
    };
};


export type ExtensionPage<TComponent = unknown> = {
    id: string;
    path: string;
    component: TComponent;
    layout?: TComponent;
};

