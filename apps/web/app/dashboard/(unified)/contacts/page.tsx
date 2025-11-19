import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const EXAMPLE_CONTACTS = [
	{
		id: "1",
		name: "Rachel Grant",
		title: "CPO · Teach DEV",
		email: "rachel@teachdev.io",
		phone: "+1 555 129 525",
		avatarInitials: "R",
		avatarColor: "bg-pink-500",
		lastMessagePreview: "Surprise birthday party for Rachel",
		lastMessageFrom: "Hannah Martin",
	},
	{
		id: "2",
		name: "Hannah Martin",
		title: "Product Manager · Teach DEV",
		email: "hannah@teachdev.io",
		phone: "+1 555 222 333",
		avatarInitials: "H",
		avatarColor: "bg-indigo-500",
		lastMessagePreview: "Reports due this week",
		lastMessageFrom: "Rachel Grant",
	},
	{
		id: "3",
		name: "Tupur Smith",
		title: "Founder · Microtech",
		email: "tupur@example.org",
		phone: "+1 98 0000 0000",
		avatarInitials: "T S",
		avatarColor: "bg-emerald-500",
		lastMessagePreview: "Follow-up on clinic launch",
		lastMessageFrom: "John Doe",
	},
];

export default function Page() {
	const primary = EXAMPLE_CONTACTS[EXAMPLE_CONTACTS.length - 1];

	return (
		<>
			<header className="flex items-center gap-2 border-b bg-background/60 backdrop-blur py-5 px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="data-[orientation=vertical]:h-4"
				/>
				<h1 className="text-sm font-semibold text-foreground/80">Contacts</h1>
			</header>

			<main className="flex flex-1 flex-col h-[calc(100vh-4rem)] overflow-hidden p-3 sm:p-4">
				<div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border bg-background/70">
					<section className="flex w-full max-w-full flex-col border-r bg-muted/40 md:w-80 lg:w-96">
						<div className="flex items-center justify-between border-b px-3 py-3">
							<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								All contacts
							</span>
						</div>

						<div className="overflow-y-auto flex-col h-[calc(100vh-10rem)]">
							{EXAMPLE_CONTACTS.map((c, idx) => (
								<button
									key={c.id}
									className={[
										"flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-background",
										idx === 0 ? "bg-background" : "bg-transparent",
									].join(" ")}
								>
									<div
										className={[
											"flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white",
											c.avatarColor,
										].join(" ")}
									>
										{c.avatarInitials}
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">
											{c.name}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{c.email}
										</p>
									</div>
								</button>
							))}
						</div>
					</section>

					<section className="hidden flex-1 flex-col bg-background/60 md:flex">
						<div className="flex items-center gap-3 border-b px-6 py-4">
							<div
								className={[
									"flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold text-white",
									primary.avatarColor,
								].join(" ")}
							>
								{primary.avatarInitials}
							</div>
							<div className="min-w-0 flex-1">
								<h2 className="truncate text-lg font-semibold text-foreground">
									{primary.name}
								</h2>
								<p className="truncate text-xs text-muted-foreground">
									{primary.title}
								</p>
							</div>
							<div className="flex gap-2">
								<button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
									Call
								</button>
								<button className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted">
									Message
								</button>
								<button className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
									Compose
								</button>
							</div>
						</div>

						<div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
							<div className="space-y-1">
								<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Contact details
								</h3>
								<dl className="mt-2 grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
									<div>
										<dt className="text-xs text-muted-foreground">Email</dt>
										<dd className="text-foreground">{primary.email}</dd>
									</div>
									<div>
										<dt className="text-xs text-muted-foreground">Phone</dt>
										<dd className="text-foreground">{primary.phone}</dd>
									</div>
								</dl>
							</div>

							<div className="space-y-2">
								<h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
									Recent mail
								</h3>
								<div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
									<p className="text-xs font-medium text-foreground">
										{primary.lastMessageFrom}
									</p>
									<p className="mt-1 text-sm text-foreground">
										{primary.lastMessagePreview}
									</p>
								</div>
							</div>
						</div>
					</section>
				</div>
			</main>
		</>
	);
}
