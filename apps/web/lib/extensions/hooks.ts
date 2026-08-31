import type { HookMap, HookName } from "@schema";
import { hooks } from "@extensions";
import { ensureExtensionsRegistered } from "./register";

export const runHook = async <K extends HookName>(
    name: K,
    context: HookMap[K],
): Promise<void> => {
    ensureExtensionsRegistered();

    await hooks.run(name, context);
};
