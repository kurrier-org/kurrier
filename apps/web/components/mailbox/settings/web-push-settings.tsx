"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	removeWebPushSubscription,
	saveWebPushSubscription,
} from "@/lib/actions/web-push";

function decodeKey(value: string) {
	const padding = "=".repeat((4 - (value.length % 4)) % 4);
	return Uint8Array.from(
		atob((value + padding).replace(/-/g, "+").replace(/_/g, "/")),
		(c) => c.charCodeAt(0),
	);
}
export default function WebPushSettings({
	publicKey,
}: {
	publicKey: string | null;
}) {
	const [enabled, setEnabled] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!publicKey || !("serviceWorker" in navigator)) return;
		navigator.serviceWorker
			.getRegistration("/")
			.then((registration) =>
				registration?.pushManager
					.getSubscription()
					.then((subscription) => setEnabled(Boolean(subscription))),
			)
			.catch(() => setError("Unable to read Web Push status."));
	}, [publicKey]);

	async function enable() {
		setBusy(true);
		setError(null);
		try {
			if (
				!publicKey ||
				!("serviceWorker" in navigator) ||
				!("PushManager" in window)
			)
				throw new Error("Web Push is not supported");
			const permission = await Notification.requestPermission();
			if (permission !== "granted")
				throw new Error("Notification permission was denied");
			const registration = await navigator.serviceWorker.register("/sw.js");
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: decodeKey(publicKey),
			});
			await saveWebPushSubscription({
				endpoint: subscription.endpoint,
				keys: {
					p256dh: subscription.toJSON().keys?.p256dh || "",
					auth: subscription.toJSON().keys?.auth || "",
				},
				userAgent: navigator.userAgent,
			});
			setEnabled(true);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Unable to enable Web Push.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function disable() {
		setBusy(true);
		setError(null);
		try {
			const registration = await navigator.serviceWorker.getRegistration("/");
			const sub = await registration?.pushManager.getSubscription();
			if (sub) {
				await removeWebPushSubscription(sub.endpoint);
				await sub.unsubscribe();
			}
			setEnabled(false);
		} catch (cause) {
			setError(
				cause instanceof Error ? cause.message : "Unable to disable Web Push.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="flex items-center gap-3">
			<Button
				type="button"
				disabled={busy || !publicKey}
				onClick={enabled ? disable : enable}
			>
				{enabled ? "Disable Web Push" : "Enable Web Push"}
			</Button>
			{error ? <span className="text-sm text-red-600">{error}</span> : null}
			{!publicKey ? (
				<span className="text-sm text-neutral-500">
					Web Push is not configured.
				</span>
			) : null}
		</div>
	);
}
