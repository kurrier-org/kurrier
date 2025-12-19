"use client";

import React from "react";
import type { MailSubscriptionEntity, MessageEntity } from "@db";
import { ExternalLink } from "lucide-react";
import { ReusableFormButton } from "@/components/common/reusable-form-button";
import { oneClickUnsubscribe } from "@/lib/actions/mailbox";
import { usePathname } from "next/navigation";
import {Badge} from "@mantine/core";

function MailUnsubscriber({ mailSubscription }: {
    message: MessageEntity;
    mailSubscription: MailSubscriptionEntity | null;
}) {
    const pathname = usePathname();
    if (!mailSubscription) return null;

    const url = mailSubscription.unsubscribeHttpUrl;

    if (mailSubscription.status === "unsubscribed") {
        return (
            <Badge size={"sm"} color="gray" variant="light" className="mt-0.5">
                Unsubscribed
            </Badge>
        );
    }

    if (!url && !mailSubscription.unsubscribeMailto) {
        return (
            <Badge>
                No unsubscribe link
            </Badge>
        );
    }

    return (
        <div className="mt-0.5 flex items-center gap-2">
            {mailSubscription.oneClick && url ? (
                <ReusableFormButton
                    action={oneClickUnsubscribe}
                    label="Unsubscribe"
                    buttonProps={{ size: "compact-xs", variant: "light" }}
                >
                    <input type="hidden" name="mailSubscriptionId" value={mailSubscription.id} />
                    <input type="hidden" name="pathname" value={pathname} />
                </ReusableFormButton>
            ) : url ? (
                <a
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
                    href={url}
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    Unsubscribe <ExternalLink size={14} />
                </a>
            ) : (
                <a
                    className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium hover:bg-gray-200"
                    href={`mailto:${mailSubscription.unsubscribeMailto}`}
                >
                    Unsubscribe <ExternalLink size={14} />
                </a>
            )}
        </div>
    );
}

export default MailUnsubscriber;
