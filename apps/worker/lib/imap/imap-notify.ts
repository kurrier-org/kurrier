import type { ImapFlow } from "imapflow";

export type ImapMailboxEvent =
    | { type: "create"; path: string }
    | { type: "rename"; oldPath: string; newPath: string }
    | { type: "delete"; path: string };

export async function registerImapNotify(
    client: ImapFlow,
    onMailboxChange: (event: ImapMailboxEvent) => void,
) {
    if (!client.capabilities.has("NOTIFY")) {
        return false;
    }

    const imap = client as any;

    imap.untaggedHandlers.LIST = (response: any) => {
        const attributes = response.attributes;
        const flags = attributes?.[0];

        const path = attributes?.[2]?.value;

        if (typeof path !== "string") {
            return;
        }

        const oldName = attributes?.[3];

        if (
            Array.isArray(oldName) &&
            oldName[0]?.value === "OLDNAME" &&
            Array.isArray(oldName[1])
        ) {
            const oldPath = oldName[1][0]?.value;

            if (typeof oldPath === "string") {
                onMailboxChange({
                    type: "rename",
                    oldPath,
                    newPath: path,
                });
                return;
            }
        }

        const flagValues = Array.isArray(flags)
            ? flags.map((flag: any) => String(flag.value ?? flag))
            : [];

        if (
            flagValues.some(
                (flag: string) =>
                    flag.toLowerCase() === "\\nonexistent",
            )
        ) {
            onMailboxChange({
                type: "delete",
                path,
            });
            return;
        }

        onMailboxChange({
            type: "create",
            path,
        });
    };

    const response = await imap.exec("NOTIFY", [
        { type: "ATOM", value: "SET" },
        [
            { type: "ATOM", value: "SELECTED" },
            [
                { type: "ATOM", value: "MessageNew" },
                { type: "ATOM", value: "MessageExpunge" },
                { type: "ATOM", value: "FlagChange" },
            ],
        ],
        [
            { type: "ATOM", value: "PERSONAL" },
            [
                { type: "ATOM", value: "MailboxName" },
                { type: "ATOM", value: "SubscriptionChange" },
            ],
        ],
    ]);

    response.next();

    return true;
}
