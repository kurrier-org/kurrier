"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Pagination } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";

type Props = {
	total: number;
	pageSize: number;
	page?: number;
	identityPublicId: string;
	mailboxSlug: string | null;
	q: string;
	has: boolean;
	unread: boolean;
	starred: boolean;
};

export default function SearchPagination({
	total,
	pageSize,
	page = 1,
	identityPublicId,
	mailboxSlug,
	q,
	has,
	unread,
	starred,
}: Props) {
	const [activePage, setPage] = useState(page);
	const router = useRouter();
	const totalPages = Math.max(1, Math.ceil((total || 1) / pageSize));
	const pathName = usePathname();
	useEffect(() => {
		if (activePage !== page && activePage) {
			const params = new URLSearchParams();
			if (q) params.set("q", q);
			params.set("has", has ? "1" : "0");
			params.set("unread", unread ? "1" : "0");
			params.set("starred", starred ? "1" : "0");
			params.set("page", String(activePage));

			router.push(
				`${pathName.match("/dashboard/mail") ? "/dashboard" : ""}/mail/${identityPublicId}/${mailboxSlug}/search?${params.toString()}`,
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activePage]);

	return (
		<Pagination value={activePage} onChange={setPage} total={totalPages} />
	);
}
