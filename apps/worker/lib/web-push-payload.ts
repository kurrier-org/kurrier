export type WebPushPayload = { title: string; body: string; url: string };
export const PUSH_APP_URL = "/";
export function makePushPayload(): WebPushPayload {
	return { title: "Kurrier", body: "New mail in Kurrier", url: PUSH_APP_URL };
}
export function pushJobId(messageId: string, subscriptionId?: string) {
	return `web-push:${messageId}${subscriptionId ? `:${subscriptionId}` : ""}`;
}
export function isStalePushEndpoint(status: number) {
	return status === 404 || status === 410;
}

export const MAX_PUSH_ATTEMPTS = 5;
export function nextPushAttempt(
	attempts: number,
	maxAttempts = MAX_PUSH_ATTEMPTS,
) {
	const next = attempts + 1;
	return { attempts: next, retryable: next < maxAttempts };
}
