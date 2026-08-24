import { Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

function Page() {
	return (
		<div className="flex min-h-svh flex-1 flex-col">
			<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:hidden">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="data-[orientation=vertical]:h-4"
				/>
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
			</div>
		</div>
	);
}

export default Page;
