import type React from "react";

export default function CalendarLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="min-w-0 flex-1 overflow-x-hidden">
			<section className="min-w-0">{children}</section>
		</main>
	);
}
