import type { KurrierExtension } from "@extensions";
import TestExtensionPage from "./test-page";

export const singleWorkspaceWebExtension = {
    manifest: {
        id: "oss.single-workspace",
        name: "Single Workspace",
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
