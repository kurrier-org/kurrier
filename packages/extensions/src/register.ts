import type { KurrierExtension } from "./types";
import { hooks } from "./hooks";

const registeredExtensions: KurrierExtension[] = [];

export const registerExtension = (
    extension: KurrierExtension,
): (() => void) => {
    const existing = registeredExtensions.find(
        (item) => item.manifest.id === extension.manifest.id,
    );

    if (existing) {
        return () => {};
    }

    registeredExtensions.push(extension);

    const unsubscribers: Array<() => void> = [];

    for (const [name, handler] of Object.entries(extension.hooks ?? {})) {
        if (!handler) {
            continue;
        }

        unsubscribers.push(
            hooks.on(name as any, handler as any),
        );
    }

    return () => {
        const index = registeredExtensions.findIndex(
            (item) => item.manifest.id === extension.manifest.id,
        );

        if (index !== -1) {
            registeredExtensions.splice(index, 1);
        }

        for (const unsubscribe of unsubscribers) {
            unsubscribe();
        }
    };
};

export const getRegisteredExtensions = (): readonly KurrierExtension[] => {
    return registeredExtensions;
};
