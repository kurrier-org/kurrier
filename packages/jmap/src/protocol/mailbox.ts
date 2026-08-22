export type JmapMailbox = {
    id: string;
    name: string;
    parentId: string | null;
    role: string | null;
    sortOrder: number;
    totalEmails: number;
    unreadEmails: number;
    totalThreads: number;
    unreadThreads: number;
    myRights: {
        mayReadItems: boolean;
        mayAddItems: boolean;
        mayRemoveItems: boolean;
        maySetSeen: boolean;
        maySetKeywords: boolean;
        mayCreateChild: boolean;
        mayRename: boolean;
        mayDelete: boolean;
        maySubmit: boolean;
    };
    isSubscribed: boolean;
};

export type JmapMailboxGetResponse = {
    accountId: string;
    state: string;
    list: JmapMailbox[];
    notFound: string[];
};

export async function getMailboxes(
    token: string,
    apiUrl: string,
    accountId: string,
): Promise<JmapMailboxGetResponse> {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            using: ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail"],
            methodCalls: [
                [
                    "Mailbox/get",
                    {
                        accountId,
                        ids: null,
                    },
                    "mailboxes",
                ],
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(
            `JMAP Mailbox/get failed: ${response.status} ${response.statusText}`,
        );
    }

    const result = await response.json();

    const [methodName, data] = result.methodResponses?.[0] ?? [];

    if (methodName === "error") {
        throw new Error(
            `JMAP Mailbox/get failed: ${data?.type ?? "unknown error"}`,
        );
    }

    if (methodName !== "Mailbox/get") {
        throw new Error(
            `Unexpected JMAP response: ${methodName ?? "missing response"}`,
        );
    }

    return data as JmapMailboxGetResponse;
}
