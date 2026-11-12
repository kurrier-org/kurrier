import type { HookHandler, HookMap, HookName } from "@schema";

const handlers = new Map<HookName, Set<HookHandler<any>>>();

export const hooks = {
	on<K extends HookName>(name: K, handler: HookHandler<K>): () => void {
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
	): Promise<Awaited<ReturnType<HookHandler<K>>> | undefined> {
		const hookHandlers = handlers.get(name) as Set<HookHandler<K>> | undefined;

		if (!hookHandlers) {
			return undefined;
		}

		for (const handler of hookHandlers) {
			const result = await handler(context);

			if (result !== undefined) {
				return result as Awaited<ReturnType<HookHandler<K>>>;
			}
		}

		return undefined;
	},

	clear(name?: HookName): void {
		if (name) {
			handlers.delete(name);
			return;
		}

		handlers.clear();
	},
};
