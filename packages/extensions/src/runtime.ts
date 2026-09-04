import type { HookMap, HookName } from "@schema";
import { registerDistribution } from "@distribution";

import { hooks } from "./hooks";

export const extensions = {
    async runHook<K extends HookName>(
        name: K,
        context: HookMap[K],
    ): Promise<void> {
        registerDistribution();

        await hooks.run(name, context);
    },
};
