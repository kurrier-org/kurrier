import React from "react";
import {
	Archive,
	Mail,
	MailOpen,
	MoreHorizontal,
	Paperclip,
	Star,
	StarOff,
	Trash2,
} from "lucide-react";
import { MailboxEntity, MessageEntity } from "@db";
import { getMessageAddress, getMessageName } from "@common/mail-client";
import { useRouter } from "next/navigation";

function MailListItem({
	message,
	activeMailbox,
	identityPublicId,
}: {
	message: MessageEntity;
	activeMailbox: MailboxEntity;
	identityPublicId: string;
}) {
	const router = useRouter();
	const onMessageClick = async () => {
		router.push(
			`/mail/${identityPublicId}/${activeMailbox.slug}/${message.id}`,
		);
	};

	return (
		<>
			<li
				key={message.id}
				className={[
					"group grid cursor-pointer grid-cols-[auto_auto_minmax(16rem,1fr)_minmax(10rem,2fr)_auto] items-center gap-3 px-3 py-2 transition-colors",
					"hover:bg-muted/50",
					// isSelected ? "bg-muted/60" : "",
				].join(" ")}
				// onDoubleClick={() => onOpenMail?.(m.id)}
				// onClick={() => setActiveMessage(message)}
				onClick={onMessageClick}
			>
				{/* Select */}
				<div className="flex items-center">
					<input
						type="checkbox"
						// checked={isSelected}
						// onChange={() => toggleRow(m.id)}
						aria-label={`Select conversation from ${fromAddress(message)}`}
						className="h-4 w-4 rounded border-muted-foreground/40"
					/>
				</div>

				{/* Star */}
				<button
					type="button"
					// onClick={() => toggleStar(m.id)}
					// aria-label={isStarred ? "Unstar" : "Star"}
					className="text-muted-foreground hover:text-foreground"
				>
					{/*{isStarred ? (*/}
					{/*    <Star className="h-4 w-4 fill-yellow-400 text-yellow-500" />*/}
					{/*) : (*/}
					{/*    <StarOff className="h-4 w-4" />*/}
					{/*)}*/}
				</button>

				{/* From */}
				<div
					className={[
						"truncate pr-2 font-semibold",
						// !m.seen ? "font-semibold text-foreground" : "text-foreground",
					].join(" ")}
					// onClick={() => onOpenMail?.(m.id)}
				>
					{getMessageName(message, 'from')}
				</div>

				{/* Subject + snippet + chips */}
				<div
					className="flex min-w-0 items-center gap-2 pr-2"
					// onClick={() => onOpenMail?.(m.id)}
				>
					<span
						className={["truncate", !message.seen ? "font-semibold" : ""].join(
							" ",
						)}
					>
						{message.subject}
					</span>
					<span className="mx-1 text-muted-foreground">–</span>
					<span className="truncate text-muted-foreground">
						{message?.text?.slice(0, 100)}
					</span>

					{/*              {m.labels?.length ? (*/}
					{/*                  <span className="hidden gap-1 md:flex">*/}
					{/*  {m.labels.map((l) => (*/}
					{/*      <span*/}
					{/*          key={l}*/}
					{/*          className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"*/}
					{/*      >*/}
					{/*      {l}*/}
					{/*    </span>*/}
					{/*  ))}*/}
					{/*</span>*/}
					{/*              ) : null}*/}

					{message.hasAttachments && (
						<Paperclip className="ml-1 hidden h-4 w-4 text-muted-foreground md:inline" />
					)}
				</div>

				{/* Date (right) */}
				<div className="ml-auto flex items-center gap-2 pl-2">
					{!message.seen ? (
						<Mail className="h-4 w-4 text-primary md:hidden" />
					) : (
						<MailOpen className="h-4 w-4 text-muted-foreground md:hidden" />
					)}
					<time className="whitespace-nowrap text-sm text-foreground">
						{message?.date?.toDateString()}
					</time>

					{/* Row hover actions (right side) */}
					<div className="ml-1 hidden items-center gap-1 text-muted-foreground group-hover:flex">
						<button
							className="rounded p-1 hover:bg-muted"
							title="Archive"
							onClick={(e) => {
								e.stopPropagation();
								/* do archive */
							}}
						>
							<Archive className="h-4 w-4" />
						</button>
						<button
							className="rounded p-1 hover:bg-muted"
							title="Delete"
							onClick={(e) => {
								e.stopPropagation();
							}}
						>
							<Trash2 className="h-4 w-4" />
						</button>
						<button
							className="rounded p-1 hover:bg-muted"
							title="More"
							onClick={(e) => e.stopPropagation()}
						>
							<MoreHorizontal className="h-4 w-4" />
						</button>
					</div>
				</div>
			</li>
		</>
	);
}

export default MailListItem;
