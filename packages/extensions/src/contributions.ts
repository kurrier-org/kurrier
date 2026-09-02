import type { DashboardNavItem } from "./types";
import { getRegisteredExtensions } from "./register";
import type { ExtensionPage } from "./types";

export const getDashboardNavigation = (): DashboardNavItem[] => {
    return getRegisteredExtensions().flatMap(
        (extension) =>
            extension.contributions?.navigation?.dashboard ?? [],
    );
};

export const getDashboardPages = (): ExtensionPage[] => {
    return getRegisteredExtensions().flatMap(
        (extension) =>
            extension.contributions?.pages?.dashboard ?? [],
    );
};
