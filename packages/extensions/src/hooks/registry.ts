import type { HookHandler, HookMap, HookName } from "@schema";

const handlers = new Map<HookName, Set<HookHandler<any>>>();

export const hooks = {
    on<K extends HookName>(
        name: K,
        handler: HookHandler<K>,
    ): () => void {
        let hookHandlers = handlers.get(name);

        if (!hookHandlers) {
            hookHandlers = new Set();
            handlers.set(name, hookHandlers);
        }

        hookHandlers.add(handler);

        return () => {
            hookHandlers.delete(handler);

            if (hookHandlers.size === 0) {
                handlers.delete(name);
            }
        };
    },

    async run<K extends HookName>(
        name: K,
        context: HookMap[K],
    ): Promise<void> {
        const hookHandlers = handlers.get(name);

        if (!hookHandlers) {
            return;
        }

        for (const handler of hookHandlers) {
            await handler(context);
        }
    },

    clear(name?: HookName): void {
        if (name) {
            handlers.delete(name);
            return;
        }

        handlers.clear();
    },
};
