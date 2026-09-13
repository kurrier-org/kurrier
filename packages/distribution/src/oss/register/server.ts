import { registerExtension } from "@extensions";
import { extensions } from "../extensions/server";

let registered = false;

export const registerExtensions = (): void => {
    if (registered) {
        return;
    }

    registered = true;

    console.info("[distribution] registering server extensions");

    for (const extension of extensions) {
        registerExtension(extension);
    }
};
