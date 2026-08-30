import { hooks } from "@extensions";
import { enforceSingleWorkspace } from "./hooks/workspace/before-create";

let registered = false;

export const registerOssHooks = () => {
    if (registered) {
        return;
    }

    registered = true;

    hooks.on(
        "workspace.beforeCreate",
        enforceSingleWorkspace,
    );
};
