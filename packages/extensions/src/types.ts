import type { Job } from "bullmq";
import type { HookHandler, HookName } from "@schema";
import type { LucideIcon } from "lucide-react";

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
    icon?: LucideIcon;
    ownerOnly?: boolean;
};

export type ExtensionContributions<TComponent = unknown> = {
    navigation?: {
        dashboard?: DashboardNavItem[];
    };
    pages?: {
        dashboard?: ExtensionPage<TComponent>[];
        auth?: ExtensionPage<TComponent>[];
    };
    workers?: ExtensionWorker[];
};


export type ExtensionPage<TComponent = unknown> = {
    id: string;
    path: string;
    component: TComponent;
    layout?: TComponent;
};

export type ExtensionWorker = {
    queue: string;
    concurrency?: number;
    handler: (job: Job) => Promise<unknown>;
};
