"use client";

import { Mail, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

export default function MobileMailLanding() {
	const { setOpenMobile } = useSidebar();

	return (
		<div className="flex min-h-svh flex-1 flex-col">
			<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:hidden">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setOpenMobile(true)}
					aria-label="Open mail navigation"
				>
					<Menu className="size-5" />
				</Button>
				<span className="text-sm font-semibold">Mail</span>
			</header>

			<div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
				<div className="mb-5 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<Mail className="size-5" />
				</div>
				<h1 className="text-lg font-semibold text-foreground">
					Choose a mailbox
				</h1>
				<p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
					Select an email account and mailbox to view your messages.
				</p>
				<Button className="mt-6 md:hidden" onClick={() => setOpenMobile(true)}>
					<Menu className="size-4" />
					Open mailboxes
				</Button>
			</div>
		</div>
	);
}
