import { registerExtension } from "@extensions";
import { extensions } from "../extensions/web";

let registered = false;

export const registerExtensions = (): void => {
    if (registered) {
        return;
    }

    registered = true;

    console.info("[distribution] registering web extensions");

    for (const extension of extensions) {
        registerExtension(extension);
    }
};
