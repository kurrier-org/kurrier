import { registerExtension } from "@extensions";
import { extensions } from "../extensions/worker";

let registered = false;

export const registerExtensions = (): void => {
    if (registered) {
        return;
    }

    registered = true;

    console.info("[distribution] registering worker extensions");

    for (const extension of extensions) {
        registerExtension(extension);
    }
};
