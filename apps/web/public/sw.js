function pushNavigationTarget(notification) {
	const candidate = notification?.data?.url;
	if (!candidate) return new URL("/", self.location.origin).href;
	try {
		const target = new URL(candidate, self.location.origin);
		if (target.origin !== self.location.origin)
			return new URL("/", self.location.origin).href;
		return target.href;
	} catch {
		return new URL("/", self.location.origin).href;
	}
}

self.addEventListener("push", (event) => {
	const payload = event.data?.json?.() || {
		title: "Kurrier",
		body: "New mail in Kurrier",
		url: "/",
	};
	event.waitUntil(
		self.registration.showNotification(payload.title, {
			body: payload.body,
			data: { url: "/" },
			tag: "kurrier-new-mail",
		}),
	);
});
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	event.waitUntil(
		clients
			.matchAll({ type: "window", includeUncontrolled: true })
			.then((windows) => {
				const target = pushNavigationTarget(event.notification);
				const open = windows.find((client) =>
					client.url.startsWith(self.location.origin),
				);
				if (open) return open.focus().then(() => open.navigate(target));
				return clients.openWindow(target);
			}),
	);
});
