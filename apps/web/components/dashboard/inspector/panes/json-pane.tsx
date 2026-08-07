"use client";

import React from "react";
import {
    InspectorPlaceholder,
} from "@/components/dashboard/inspector/inspector-bar";
import type { MessageEntity } from "@db";

type SmtpPaneProps = {
    message?: MessageEntity;
};


export default function JsonPane({
                                     message,
                                 }: SmtpPaneProps) {



    if (!message) {
        return (
            <InspectorPlaceholder
                title="JSON"
                description=""
            >
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No message selected.
                </div>
            </InspectorPlaceholder>
        );
    }

    return (
        <InspectorPlaceholder
            title="JSON"
            description=""
        >
            <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-auto p-4">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        In Progress
                    </div>

                </div>
            </div>
        </InspectorPlaceholder>
    );
}
