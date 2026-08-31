import { registerHooks } from "./hooks/register";

let registered = false;

export const registerDistribution = () => {
    if (registered) {
        return;
    }

    registered = true;

    registerHooks();
};
