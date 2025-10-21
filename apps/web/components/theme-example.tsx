import React from "react";
import { ThemeControls } from "@/components/common/theme-controls";
import { Marquee } from "@/components/magicui/marquee";

function ThemeExample() {
	return (
		<>
			<div className={"w-screen"}>
				<ThemeControls />

				<Marquee>
					<div className={"h-20 w-20 bg-brand m-2"}></div>
					<div className={"h-20 w-20 bg-brand m-2"}></div>
					<div className={"h-20 w-20 bg-brand m-2"}></div>
					<div className={"h-20 w-20 bg-brand m-2"}></div>
					<div className={"h-20 w-20 bg-brand m-2"}></div>
					<div className={"h-20 w-20 bg-brand m-2"}></div>
					<div className={"h-20 w-20 bg-brand m-2"}></div>
					<div className={"h-20 w-20 bg-brand m-2"}></div>
				</Marquee>

				<h1 className="text-3xl font-semibold">Kurrier Dashboard</h1>
				<p className="text-base leading-7 text-muted-foreground">
					A clean, Supabase-inspired mailbox UI.
				</p>

				<div className="grid gap-4 p-8">
					<div className="bg-brand text-brand-foreground p-4 rounded-lg">
						<h2 className="font-semibold">Muted</h2>
						<p className="text-sm">
							For subtle backgrounds, placeholders, or quiet UI elements.
						</p>
					</div>
					{/* Muted */}
					<div className="bg-muted text-muted-foreground p-4 rounded-lg">
						<h2 className="font-semibold">Muted</h2>
						<p className="text-sm">
							For subtle backgrounds, placeholders, or quiet UI elements.
						</p>
					</div>

					{/* Accent */}
					<div className="bg-accent text-accent-foreground p-4 rounded-lg">
						<h2 className="font-semibold">Accent</h2>
						<p className="text-sm">
							For highlighted sections or callouts that need more attention.
						</p>
					</div>

					{/* Destructive */}
					<div className="bg-destructive text-destructive-foreground p-4 rounded-lg">
						<h2 className="font-semibold">Destructive</h2>
						<p className="text-sm">
							For errors, deletions, or anything with danger semantics.
						</p>
					</div>
				</div>

				<div className="bg-background border border-brand-600 rounded-lg p-6 max-w-md w-full shadow">
					<h2 className="text-xl font-bold text-brand mb-2">New Message</h2>
					<p className="text-foreground/80 mb-4">
						This is styled using your background, foreground, and brand tokens.
						In light mode the background is light, in dark mode it’s dark — but
						the classes stay the same.
					</p>
					<button className="bg-brand text-white px-4 py-2 rounded-md hover:opacity-90">
						Reply
					</button>
				</div>
			</div>
		</>
	);
}

export default ThemeExample;
