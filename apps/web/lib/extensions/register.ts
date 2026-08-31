import { registerDistribution } from "@distribution";

let registered = false;

export const ensureExtensionsRegistered = () => {
    if (registered) {
        return;
    }

    registered = true;

    registerDistributionHooks();
};
