"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Pagination } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";

type LabelPaginationProps = {
	total: number;
	pageSize: number;
	page?: number;
	identityPublicId: string;
	mailboxSlug: string;
	labelSlug: string;
};

export default function LabelPagination({
	total,
	pageSize,
	page = 1,
	identityPublicId,
	mailboxSlug,
	labelSlug,
}: LabelPaginationProps) {
	const [activePage, setPage] = useState(page);
	const router = useRouter();
	const pathname = usePathname();

	const totalPages = Math.max(1, Math.ceil((total || 1) / pageSize));

	useEffect(() => {
		if (activePage !== page && activePage) {
			const base = pathname.match("/dashboard/mail") ? "/dashboard" : "";
			const url = `${base}/mail/${identityPublicId}/${mailboxSlug}/label/${labelSlug}?page=${activePage}`;
			router.push(url);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activePage]);

	return (
		<Pagination value={activePage} onChange={setPage} total={totalPages} />
	);
}
