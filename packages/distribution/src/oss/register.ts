import { registerOssHooks } from "./hooks/register";

let registered = false;

export const registerOssDistribution = () => {
    if (registered) {
        return;
    }

    registered = true;

    registerOssHooks();
};

