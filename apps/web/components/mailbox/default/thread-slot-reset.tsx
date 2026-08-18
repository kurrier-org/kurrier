"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";

/**
 * The @thread parallel route is an intercepted slot rendered as a sibling
 * of `children` in [mailboxSlug]/layout.tsx. Next.js only swaps that slot's
 * content when the URL segments it actually matches change — clicking away
 * from an open thread to the same mailboxSlug (e.g. "Inbox" while already
 * viewing a thread under Inbox) doesn't change [mailboxSlug], so the slot's
 * last-rendered thread view can stay mounted instead of falling back to
 * @thread/default.tsx, even though the URL has already updated.
 *
 * Keying the slot by the current pathname forces React to unmount the
 * stale thread subtree whenever the URL changes at all, so it always
 * re-resolves against the new path instead of holding onto old content.
 * Uses Fragment (not a div) so this doesn't add a DOM node into the
 * surrounding flex/grid layout.
 */
export default function ThreadSlotReset({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	return <Fragment key={pathname}>{children}</Fragment>;
}
