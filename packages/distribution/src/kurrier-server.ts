import type { HookMap, HookName } from "@schema";
import {
    type ExtensionWorker,
    getRegisteredExtensions,
    hooks,
} from "@extensions";
import { enqueueJob } from "@common";

import { registerServerExtensions } from "./register/server";
import { registerWorkerExtensions } from "./register/worker";
import { KURRIER_VERSION } from "./version";

export type KurrierServer = {
    version: string;

    hooks: {
        run<K extends HookName>(
            name: K,
            context: HookMap[K],
        ): Promise<void>;
    };

    jobs: {
        enqueue<T>(input: {
            queue: string;
            name: string;
            data: T;
        }): Promise<unknown>;
    };

    workers: {
        get(): ExtensionWorker[];
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

    jobs: {
        async enqueue<T>({ queue, name, data }: {
            queue: string;
            name: string;
            data: T;
        }) {
            return enqueueJob(queue, name, data);
        },
    },

    workers: {
        get() {
            registerWorkerExtensions();

            return getRegisteredExtensions().flatMap(
                (extension) =>
                    extension.contributions?.workers ?? [],
            );
        },
    },
};
