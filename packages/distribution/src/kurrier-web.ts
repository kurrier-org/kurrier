import type {
    DashboardNavItem,
    ExtensionPage,
} from "@extensions";
import { getRegisteredExtensions } from "@extensions";

import { registerWebExtensions } from "./register/web";
import { DISTRIBUTION_PAGES } from "./pages";
import { KURRIER_VERSION } from "./version";

export type KurrierWeb = {
    version: string;

    pages: {
        distribution: () => typeof DISTRIBUTION_PAGES;
        dashboard: () => ExtensionPage[];
    };

    navigation: {
        dashboard: () => DashboardNavItem[];
    };
};

export const kurrierWeb: KurrierWeb = {
    version: KURRIER_VERSION,

    pages: {
        distribution() {
            return DISTRIBUTION_PAGES;
        },

        dashboard() {
            registerWebExtensions();

            return getRegisteredExtensions().flatMap(
                (extension) =>
                    extension.contributions?.pages?.dashboard ?? [],
            );
        },
    },

    navigation: {
        dashboard() {
            registerWebExtensions();

            return getRegisteredExtensions().flatMap(
                (extension) =>
                    extension.contributions?.navigation?.dashboard ?? [],
            );
        },
    },
};
