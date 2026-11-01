import type {HookHandler, HookMap, HookName} from "@schema";
import {
    ExtensionScheduler,
    type ExtensionWorker,
    type ExtensionService,
    getRegisteredExtensions,
    hooks,
} from "@extensions";
import { enqueueJob } from "@common";

import { registerServerExtensions } from "./register/server";
import { registerWorkerExtensions } from "./register/worker";
import { KURRIER_VERSION } from "./version";
import {Job} from "bullmq";

export type KurrierServer = {
    version: string;

    hooks: {
        run<K extends HookName>(
            name: K,
            context: HookMap[K],
        ): Promise<Awaited<ReturnType<HookHandler<K>>> | undefined>;
    };

    jobs: {
        enqueue<T>(input: {
            queue: string;
            name: string;
            data: T;
        }): Promise<Job | undefined>;
    };

    workers: {
        get(): ExtensionWorker[];
    };
    schedulers: {
        get(): ExtensionScheduler[];
    };
    services: {
        get(): ExtensionService[];
    };
};

export const kurrierServer: KurrierServer = {
    version: KURRIER_VERSION,

    hooks: {
        async run<K extends HookName>(
            name: K,
            context: HookMap[K],
        ): Promise<Awaited<ReturnType<HookHandler<K>>> | undefined> {
            registerServerExtensions();
            return await hooks.run(name, context);
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

    schedulers: {
        get() {
            registerWorkerExtensions();

            return getRegisteredExtensions().flatMap(
                (extension) =>
                    extension.contributions?.schedulers ?? [],
            );
        },
    },
    services: {
        get() {
            registerWorkerExtensions();
            return getRegisteredExtensions().flatMap(
                (extension) =>
                    extension.contributions?.services ?? [],
            );
        },
    },
};
