"use client";
import React, {use, useEffect, useState} from "react";
import { Pagination } from "@mantine/core";
import { useParams, usePathname, useRouter } from "next/navigation";
import {FetchMailboxResult} from "@/lib/actions/mailbox";

function MailPagination({
	// count,
	// mailboxSlug,
	workspacePublicId,
	identityPublicId,
	fetchMailboxPromise,
	page
}: {
	// count: number;
	// mailboxSlug: string | null;
	workspacePublicId: string;
	identityPublicId: string;
	fetchMailboxPromise: Promise<FetchMailboxResult>;
	page?: number;
}) {
	const {count, activeMailbox} = use(fetchMailboxPromise)
	const mailboxSlug = activeMailbox?.slug || null;
	const [activePage, setPage] = useState(page || 1);
	const router = useRouter();
	const pathname = usePathname();
	const params = useParams();

	const updatePageNumber = async (number: number) => {
		if (number < 1) return;
		if (Number(number) === 1) {
			router.push(
				`/w/${workspacePublicId}/dashboard/mail/${identityPublicId}/${mailboxSlug}`,
			);
			return;
		}
		router.push(
			`/w/${workspacePublicId}/dashboard/mail/${identityPublicId}/${mailboxSlug}?page=${number}`,
		);
		setPage(number);
	};

	return (
		<div className={params?.threadId ? "hidden" : ""}>
			<Pagination
				value={activePage}
				onChange={updatePageNumber}
				total={count > 0 ? count / 50 : 0}
			/>
		</div>
	);
}

export default MailPagination;
