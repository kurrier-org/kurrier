export type JmapEmailQueryResponse = {
    accountId: string;
    queryState: string;
    canCalculateChanges: boolean;
    position: number;
    ids: string[];
    total?: number;
    limit?: number;
};

export type JmapEmail = {
    id: string;
    blobId: string;
    threadId: string;
    mailboxIds: Record<string, boolean>;
    keywords: Record<string, boolean>;
    size: number;
    receivedAt: string;
    sentAt?: string;
    subject?: string;
    from?: Array<{
        name?: string;
        email: string;
    }>;
    to?: Array<{
        name?: string;
        email: string;
    }>;
    cc?: Array<{
        name?: string;
        email: string;
    }>;
    bcc?: Array<{
        name?: string;
        email: string;
    }>;
    replyTo?: Array<{
        name?: string;
        email: string;
    }>;
    textBody?: Array<{
        partId: string;
        type: string;
    }>;
    htmlBody?: Array<{
        partId: string;
        type: string;
    }>;
    attachments?: Array<Record<string, unknown>>;
    bodyValues?: Record<
        string,
        {
            value: string;
            isEncodingProblem?: boolean;
            isTruncated?: boolean;
        }
    >;
};

export type JmapEmailGetResponse = {
    accountId: string;
    state: string;
    list: JmapEmail[];
    notFound: string[];
};

export type JmapEmailChangesResponse = {
    accountId: string;
    oldState: string;
    newState: string;
    hasMoreChanges: boolean;
    created: string[];
    updated: string[];
    destroyed: string[];
};

export async function queryEmails(
    token: string,
    apiUrl: string,
    accountId: string,
    mailboxId: string,
): Promise<JmapEmailQueryResponse> {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            using: [
                "urn:ietf:params:jmap:core",
                "urn:ietf:params:jmap:mail",
            ],
            methodCalls: [
                [
                    "Email/query",
                    {
                        accountId,
                        filter: {
                            inMailbox: mailboxId,
                        },
                        sort: [
                            {
                                property: "receivedAt",
                                isAscending: false,
                            },
                        ],
                    },
                    "email-query",
                ],
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(
            `JMAP Email/query failed: ${response.status} ${response.statusText}`,
        );
    }

    const result = await response.json();

    const [methodName, data] =
    result.methodResponses?.[0] ?? [];

    if (methodName === "error") {
        throw new Error(
            `JMAP Email/query failed: ${data?.type ?? "unknown error"}`,
        );
    }

    if (methodName !== "Email/query") {
        throw new Error(
            `Unexpected JMAP response: ${methodName ?? "missing response"}`,
        );
    }

    return data as JmapEmailQueryResponse;
}

export async function getEmails(
    token: string,
    apiUrl: string,
    accountId: string,
    ids: string[],
): Promise<JmapEmailGetResponse> {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            using: [
                "urn:ietf:params:jmap:core",
                "urn:ietf:params:jmap:mail",
            ],
            methodCalls: [
                [
                    "Email/get",
                    {
                        accountId,
                        ids,
                        properties: [
                            "id",
                            "blobId",
                            "threadId",
                            "mailboxIds",
                            "keywords",
                            "size",
                            "receivedAt",
                            "sentAt",
                            "subject",
                            "from",
                            "to",
                            "cc",
                            "bcc",
                            "replyTo",
                            "textBody",
                            "htmlBody",
                            "attachments",
                            "bodyValues",
                        ],
                        fetchTextBodyValues: true,
                        fetchHTMLBodyValues: true,
                    },
                    "email-get",
                ],
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(
            `JMAP Email/get failed: ${response.status} ${response.statusText}`,
        );
    }

    const result = await response.json();

    const [methodName, data] =
    result.methodResponses?.[0] ?? [];

    if (methodName === "error") {
        throw new Error(
            `JMAP Email/get failed: ${data?.type ?? "unknown error"}`,
        );
    }

    if (methodName !== "Email/get") {
        throw new Error(
            `Unexpected JMAP response: ${methodName ?? "missing response"}`,
        );
    }

    return data as JmapEmailGetResponse;
}

export async function changesEmails(
    token: string,
    apiUrl: string,
    accountId: string,
    sinceState: string,
): Promise<JmapEmailChangesResponse> {
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify({
            using: [
                "urn:ietf:params:jmap:core",
                "urn:ietf:params:jmap:mail",
            ],
            methodCalls: [
                [
                    "Email/changes",
                    {
                        accountId,
                        sinceState,
                        maxChanges: 1000,
                    },
                    "email-changes",
                ],
            ],
        }),
    });

    if (!response.ok) {
        throw new Error(
            `JMAP Email/changes failed: ${response.status} ${response.statusText}`,
        );
    }

    const result = await response.json();

    const [methodName, data] =
    result.methodResponses?.[0] ?? [];

    if (methodName === "error") {
        throw new Error(
            `JMAP Email/changes failed: ${data?.type ?? "unknown error"}`,
        );
    }

    if (methodName !== "Email/changes") {
        throw new Error(
            `Unexpected JMAP response: ${methodName ?? "missing response"}`,
        );
    }

    return data as JmapEmailChangesResponse;
}
