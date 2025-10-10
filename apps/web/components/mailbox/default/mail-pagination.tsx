"use client";
import React, { useState } from "react";
import { Pagination } from "@mantine/core";
import { useRouter } from "next/navigation";

function MailPagination({
	count,
	mailboxSlug,
	identityPublicId,
	page,
}: {
	count: number;
	mailboxSlug: string | null;
	identityPublicId: string;
	page?: number;
}) {
	const [activePage, setPage] = useState(page || 1);
	const router = useRouter();

    const updatePageNumber = async (number: number) => {
        if (number < 1) return;
        if (Number(number) === 1) {
            router.push(`/mail/${identityPublicId}/${mailboxSlug}`);
            return
        }
        router.push(
            `/mail/${identityPublicId}/${mailboxSlug}?page=${number}`,
        );
        setPage(number)

    };

	return (
		<Pagination
			value={activePage}
			onChange={updatePageNumber}
			total={count > 0 ? count / 50 : 0}
		/>
	);
}

export default MailPagination;
