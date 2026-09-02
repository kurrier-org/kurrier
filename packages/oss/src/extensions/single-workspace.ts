import type { KurrierExtension } from "@extensions";

import { enforceSingleWorkspace } from "../hooks/workspace/before-create";
import TestExtensionPage from "./test-page";

export const singleWorkspaceExtension = {
    manifest: {
        id: "oss.single-workspace",
        name: "Single Workspace",
    },

    hooks: {
        "workspace.beforeCreate": enforceSingleWorkspace,
    },

    contributions: {
        navigation: {
            dashboard: [
                {
                    id: "test-page",
                    title: "Extension Test",
                    path: "platform/extensions/test",
                    icon: "Blocks",
                },
            ],
        },

        pages: {
            dashboard: [
                {
                    id: "test-page",
                    path: "test",
                    component: TestExtensionPage,
                },
            ],
        },
    },
} satisfies KurrierExtension;
