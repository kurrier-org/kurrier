"use client";

import React, { useMemo, useState } from "react";
import { ActionIcon, Input, Select } from "@mantine/core";

import type { MessageEntity } from "@db";
import { getMessageAddress } from "@common/mail-client";

import type { FetchIdentityMailboxListResult } from "@/lib/actions/mailbox";
import EmailHeaderContacts from "@/components/mailbox/default/editor/email-header-contacts";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

type ComposerMode = "compose" | "reply" | "forward";

type MailComposerHeaderProps = {
    mode: ComposerMode;
    subject: string;
    identityPublicId: string;
    identityMailboxes: FetchIdentityMailboxListResult;
    message?: MessageEntity | null;

    onModeChange: (mode: ComposerMode) => void;
    onSubjectChange: (subject: string) => void;
    onIdentityChange: (identityPublicId: string) => void;
};

export default function MailComposerHeader({
                                               mode,
                                               subject,
                                               identityPublicId,
                                               identityMailboxes,
                                               message,
                                               onModeChange,
                                               onSubjectChange,
                                               onIdentityChange,
                                           }: MailComposerHeaderProps) {
    const dict = useOptionalDictionary();

    const [ccVisible, setCcVisible] = useState(false);
    const [bccVisible, setBccVisible] = useState(false);

    const fromOptions = useMemo(
        () =>
            identityMailboxes.map((item) => ({
                value: item.identity.publicId,
                label: item.identity.value,
            })),
        [identityMailboxes],
    );

    const toEmail = useMemo(() => {
        if (!message) return "";
        return getMessageAddress(message, "from") || "";
    }, [message]);

    return (
        <div>
            <input type="hidden" name="mode" value={mode} />

            <div className="flex items-start gap-3 border-b px-4 py-2">
				<span className="w-14 shrink-0 pt-2 text-sm text-muted-foreground">
					{dict?.mailbox?.to ?? "To"}
				</span>

                <div className="min-w-0 flex-1">
                    <EmailHeaderContacts
                        name="to"
                        toEmail={toEmail}
                    />
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    {!ccVisible && (
                        <ActionIcon
                            type="button"
                            variant="transparent"
                            onClick={() => setCcVisible(true)}
                        >
							<span className="text-xs">
								{dict?.mailbox?.cc ?? "Cc"}
							</span>
                        </ActionIcon>
                    )}

                    {!bccVisible && (
                        <ActionIcon
                            type="button"
                            variant="transparent"
                            onClick={() => setBccVisible(true)}
                        >
							<span className="text-xs">
								{dict?.mailbox?.bcc ?? "Bcc"}
							</span>
                        </ActionIcon>
                    )}
                </div>
            </div>

            {ccVisible && (
                <div className="flex items-start gap-3 border-b px-4 py-2">
					<span className="w-14 shrink-0 pt-2 text-sm text-muted-foreground">
						{dict?.mailbox?.cc ?? "Cc"}
					</span>

                    <div className="min-w-0 flex-1">
                        <EmailHeaderContacts
                            name="cc"
                            toEmail=""
                        />
                    </div>
                </div>
            )}

            {bccVisible && (
                <div className="flex items-start gap-3 border-b px-4 py-2">
					<span className="w-14 shrink-0 pt-2 text-sm text-muted-foreground">
						{dict?.mailbox?.bcc ?? "Bcc"}
					</span>

                    <div className="min-w-0 flex-1">
                        <EmailHeaderContacts
                            name="bcc"
                            toEmail=""
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 border-b px-4 py-2">
				<span className="w-14 shrink-0 text-sm text-muted-foreground">
					{dict?.mailbox?.subject ?? "Subject"}
				</span>

                <Input
                    name="subject"
                    variant="unstyled"
                    className="flex-1"
                    value={subject}
                    onChange={(event) =>
                        onSubjectChange(event.currentTarget.value)
                    }
                />
            </div>

            <div className="flex items-center gap-3 border-b px-4 py-2">
				<span className="w-14 shrink-0 text-sm text-muted-foreground">
					{dict?.mailbox?.from ?? "From"}
				</span>

                <Select
                    name="identityPublicId"
                    variant="unstyled"
                    className="flex-1"
                    value={identityPublicId || null}
                    onChange={(value) => {
                        if (value) {
                            onIdentityChange(value);
                        }
                    }}
                    data={fromOptions}
                    comboboxProps={{
                        withinPortal: true,
                        position: "bottom-start",
                        offset: 8,
                        zIndex: 3000,
                    }}
                />
            </div>
        </div>
    );
}
