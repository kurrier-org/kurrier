"use client";

import * as React from "react";
import {
	CommandDialog,
	CommandInput,
	CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Search, Paperclip } from "lucide-react";
import { initSearch } from "@/lib/actions/mailbox";
import type { User } from "@supabase/supabase-js";
import type { ThreadHit, SearchThreadsResponse } from "@schema";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconStar, IconStarFilled } from "@tabler/icons-react";

export default function MailboxSearch({
	user,
	publicId,
	mailboxSlug,
}: {
	user: User | null;
	publicId: string;
	mailboxSlug: string;
}) {
	const [open, setOpen] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const [hasAttachment, setHasAttachment] = React.useState(false);
	const [onlyUnread, setOnlyUnread] = React.useState(false);
	const [isStarred, setIsStarred] = React.useState(false);

	const [loading, setLoading] = React.useState(false);
	const [items, setItems] = React.useState<ThreadHit[]>([]);
	const [totalThreads, setTotalThreads] = React.useState(0);
	const [totalMessages, setTotalMessages] = React.useState(0);

	React.useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setOpen((v) => !v);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const doSearch = React.useMemo(() => {
		let t: ReturnType<typeof setTimeout> | null = null;
		return (q: string, attach: boolean, unread: boolean, starred: boolean) => {
			if (t) clearTimeout(t);
			t = setTimeout(async () => {
				if (!q.trim()) {
					setItems([]);
					setTotalThreads(0);
					setTotalMessages(0);
					return;
				}
				try {
					setLoading(true);
					const res = (await initSearch(
						q,
						String(user?.id),
						attach,
						unread,
						starred,
						1,
					)) as SearchThreadsResponse;

					setItems(res.items || []);
					setTotalThreads(res.totalThreads ?? res.items?.length ?? 0);
					setTotalMessages(res.totalMessages ?? res.items?.length ?? 0);
				} catch (e) {
					setItems([]);
					setTotalThreads(0);
					setTotalMessages(0);
				} finally {
					setLoading(false);
				}
			}, 250);
		};
	}, [user?.id]);

	React.useEffect(() => {
		doSearch(query, hasAttachment, onlyUnread, isStarred);
	}, [query, hasAttachment, onlyUnread, isStarred, doSearch]);

	const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>) =>
		setter((v) => !v);

	const router = useRouter();

	const pathName = usePathname();

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="flex w-full items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-muted-foreground hover:bg-muted/30"
			>
				<Search className="h-4 w-4 opacity-60" />
				<span className="text-sm">Search all mailboxes (⌘K)</span>
			</button>

			<CommandDialog open={open} onOpenChange={setOpen}>
				<CommandInput
					autoFocus
					placeholder="Search mail…"
					value={query}
					onValueChange={setQuery}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							setOpen(false);
							router.push(
								`${pathName.match("/dashboard/mail") ? "/dashboard" : ""}/mail/${publicId}/${mailboxSlug}/search?q=${encodeURIComponent(query)}&has=${hasAttachment ? "1" : "0"}&unread=${onlyUnread ? "1" : "0"}&starred=${isStarred ? "1" : "0"}`,
							);
						}
					}}
				/>

				<div className="sticky top-0 z-10 flex flex-wrap gap-2 border-b bg-background px-4 py-2">
					<Badge
						onClick={() => toggle(setHasAttachment)}
						className={`cursor-pointer rounded-full px-3 py-1 text-sm ${
							hasAttachment ? "bg-primary text-primary-foreground" : ""
						}`}
						variant={hasAttachment ? "default" : "secondary"}
					>
						Has attachment
					</Badge>

					<Badge
						onClick={() => toggle(setOnlyUnread)}
						className={`cursor-pointer rounded-full px-3 py-1 text-sm ${
							onlyUnread ? "bg-primary text-primary-foreground" : ""
						}`}
						variant={onlyUnread ? "default" : "secondary"}
					>
						Unread only
					</Badge>

					<Badge
						onClick={() => toggle(setIsStarred)}
						className={`cursor-pointer rounded-full px-3 py-1 text-sm ${
							isStarred ? "bg-primary text-primary-foreground" : ""
						}`}
						variant={isStarred ? "default" : "secondary"}
					>
						Starred only
					</Badge>
				</div>

				<div className="px-4 py-2 text-xs text-muted-foreground">
					{loading
						? "Searching…"
						: `Threads: ${totalThreads} · Messages: ${totalMessages}`}
				</div>

				<div className="max-h-[60vh] overflow-auto px-2 pb-2">
					{items.length === 0 && !loading ? (
						<div className="px-4 py-8 text-center text-sm text-muted-foreground">
							No results found.
						</div>
					) : (
						<ul className="space-y-2">
							{items.map((t) => (
								<li key={t.id} className={"my-2"}>
									<Link
										href={`${pathName.match("/dashboard/mail") ? "/dashboard/mail" : "/mail"}/${publicId}/inbox/threads/${t.threadId}`}
										type="button"
										className="w-full rounded-md px-4 py-3 text-left hover:bg-muted/60 block focus:outline-none focus:ring-2 focus:ring-ring"
									>
										<div className="flex items-center gap-2">
											<span className={"flex mt-0.5"}>
												{t.starred ? (
													<IconStarFilled
														className={"text-yellow-400"}
														size={12}
													/>
												) : (
													<IconStar className="h-3 w-3" />
												)}
											</span>
											<span
												aria-hidden
												className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
													t.unread ? "bg-primary" : "bg-muted-foreground/30"
												}`}
											/>
											<div className="truncate text-[15px] font-medium">
												{t.subject || "(no subject)"}
											</div>
											{t.hasAttachment && (
												<span className="ml-1 text-muted-foreground">
													<Paperclip className="h-3.5 w-3.5" />
												</span>
											)}
										</div>

										{t.snippet && (
											<div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
												{t.snippet}
											</div>
										)}

										<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
											{t.fromName && (
												<span className="truncate">{t.fromName}</span>
											)}
											{t.fromEmail && !t.fromName && (
												<span className="truncate">{t.fromEmail}</span>
											)}
											{t.participants?.length > 0 && (
												<>
													<span>•</span>
													<span className="truncate">
														{t.participants.slice(0, 2).join(", ")}
														{t.participants.length > 2 ? " …" : ""}
													</span>
												</>
											)}
											{t.createdAt ? (
												<div className={"flex min-w-16"}>
													<span>•&nbsp;</span>
													<span>
														{new Date(t.createdAt).toLocaleDateString(
															undefined,
															{
																month: "short",
																day: "numeric",
															},
														)}
													</span>
												</div>
											) : null}
										</div>
									</Link>
								</li>
							))}
						</ul>
					)}
				</div>

				<CommandSeparator />

				{/* FOOTER */}
				<div className="flex items-center justify-between rounded-b-lg bg-background/95 px-4 py-3 backdrop-blur">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Search className="h-4 w-4 opacity-70" />
						<span>
							All search results for{" "}
							<span className="font-medium text-foreground">
								{`‘${query || ""}’`}
							</span>
						</span>
					</div>
					<div className="text-xs text-muted-foreground">Press ENTER</div>
				</div>
			</CommandDialog>
		</>
	);
}
