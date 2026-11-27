import { createHmac, timingSafeEqual } from "node:crypto";

export function validMailgunSignature(
	body: Record<string, unknown>,
	key: string | undefined,
	now = Date.now(),
) {
	if (
		!key ||
		typeof body.timestamp !== "string" ||
		typeof body.token !== "string" ||
		typeof body.signature !== "string"
	)
		return false;
	const timestamp = Number(body.timestamp);
	if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > 300)
		return false;
	if (!/^[a-f0-9]{64}$/i.test(body.signature)) return false;
	const expected = createHmac("sha256", key)
		.update(body.timestamp + body.token)
		.digest();
	return timingSafeEqual(expected, Buffer.from(body.signature, "hex"));
}
