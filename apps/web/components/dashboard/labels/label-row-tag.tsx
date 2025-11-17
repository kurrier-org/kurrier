import React from "react";
import { FetchMailboxThreadLabelsResult } from "@/lib/actions/mailbox";
import { Badge } from "@mantine/core";
import { useParams } from "next/navigation";

function LabelRowTag({
	threadId,
	labelsByThreadId,
	isRead,
}: {
	threadId: string;
	labelsByThreadId: FetchMailboxThreadLabelsResult;
	isRead: boolean;
}) {
	const labelThreads = labelsByThreadId[threadId] || [];
	const { labelSlug } = useParams();
	return labelThreads
		.filter(({ label }) => {
			return labelSlug ? label.slug.toLowerCase() !== labelSlug : true;
		})
		.map(({ label }) => (
			<Badge
				size={"xs"}
				className={"min-w-fit"}
				opacity={isRead ? 0.75 : 1}
				key={label.id}
				color={label.colorBg}
				radius={"md"}
				variant={"filled"}
			>
				{label.name}
			</Badge>
		));
}

export default LabelRowTag;
