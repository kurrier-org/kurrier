import type { HookMap, HookName } from "@schema";
import { hooks } from "@extensions";
import { registerDistribution } from "@distribution";

export const runHook = async <K extends HookName>(
    name: K,
    context: HookMap[K],
): Promise<void> => {
    registerDistribution();

    await hooks.run(name, context);
};
