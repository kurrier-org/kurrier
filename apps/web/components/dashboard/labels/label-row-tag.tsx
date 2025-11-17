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
    const slug = typeof labelSlug === "string" ? labelSlug.toLowerCase() : undefined;

    const visibleLabels = labelThreads.filter((item) => {
        const label = item.label;
        if (!label) return false;
        if (!slug) return true;
        return label.slug?.toLowerCase() !== slug;
    });

    return visibleLabels.map((item) => {
        const label = item.label!;

        return (
            <Badge
                size="xs"
                className="min-w-fit"
                opacity={isRead ? 0.75 : 1}
                key={label.id}
                color={label.colorBg ?? undefined}
                radius="md"
                variant="filled"
            >
                {label.name}
            </Badge>
        );
    });
}

export default LabelRowTag;
