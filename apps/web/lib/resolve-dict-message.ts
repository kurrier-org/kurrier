/**
 * Resolves a server-provided message against a dictionary namespace.
 *
 * Server actions and Zod schemas are meant to return stable dotted keys
 * (e.g. "invalidCredentials" or "email.invalid") instead of literal English
 * text, so the client can translate them. During migration most messages
 * are still literal English strings — those simply won't match any key in
 * the namespace, so this falls back to rendering the raw value untranslated.
 */
export function resolveDictMessage(
	namespace: Record<string, unknown> | undefined,
	value: string,
): string {
	if (!namespace) return value;

	let node: unknown = namespace;
	for (const part of value.split(".")) {
		if (
			node &&
			typeof node === "object" &&
			!Array.isArray(node) &&
			part in (node as Record<string, unknown>)
		) {
			node = (node as Record<string, unknown>)[part];
		} else {
			return value;
		}
	}

	return typeof node === "string" ? node : value;
}
