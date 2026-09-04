import type { HookMap, HookName } from "@schema";
import { hooks } from "@extensions";

import { registerServerExtensions } from "./register/server";
import { KURRIER_VERSION } from "./version";

export type KurrierServer = {
    version: string;

    hooks: {
        run<K extends HookName>(
            name: K,
            context: HookMap[K],
        ): Promise<void>;
    };
};

export const kurrierServer: KurrierServer = {
    version: KURRIER_VERSION,

    hooks: {
        async run<K extends HookName>(
            name: K,
            context: HookMap[K],
        ): Promise<void> {
            registerServerExtensions();

            await hooks.run(name, context);
        },
    },
};
