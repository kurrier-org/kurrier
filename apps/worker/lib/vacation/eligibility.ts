export function replyRecipient(
	headers: Record<string, unknown>,
	identity: string,
	envelopeSender?: string,
): string | null {
	const normalized = Object.fromEntries(
		Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
	);
	const text = (key: string) => {
		const value = normalized[key];
		return (
			typeof value === "string" ? value : JSON.stringify(value ?? "")
		).toLowerCase();
	};
	if (
		[
			"list",
			"list-id",
			"list-unsubscribe",
			"x-autoreply",
			"x-autorespond",
		].some((key) => normalized[key] !== undefined)
	)
		return null;
	if (/\b(list|bulk|junk)\b/.test(text("precedence"))) return null;
	if (
		normalized["auto-submitted"] !== undefined &&
		text("auto-submitted").split(";")[0].trim() !== "no"
	)
		return null;
	if (/\b(oof|all)\b/.test(text("x-auto-response-suppress"))) return null;
	if (
		/delivery-status|disposition-notification|multipart\/report/.test(
			text("content-type"),
		)
	)
		return null;
	const value =
		envelopeSender ?? text("return-path").replace(/^.*<([^>]*)>.*$/, "$1");
	const sender = value.trim().toLowerCase();
	if (!sender || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(sender)) return null;
	if (
		sender === identity.toLowerCase() ||
		/^(mailer-daemon|postmaster|no-?reply)@/.test(sender)
	)
		return null;
	return sender;
}
