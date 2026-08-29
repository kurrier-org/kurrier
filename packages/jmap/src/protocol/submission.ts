import { uploadBlob } from "./blobs";

export type JmapSendEmailInput = {
    accountId: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    text?: string;
    html?: string;
    inReplyTo?: string;
    references?: string[];
    attachments?: {
        name: string;
        content: Blob;
        contentType: string;
    }[];
};

export type JmapSendEmailResult = {
    emailId: string;
    submissionId: string;
    messageId: string;
};

type JmapIdentity = {
    id: string;
    name: string;
    email: string;
    replyTo?: Array<{
        name?: string;
        email: string;
    }>;
    bcc?: Array<{
        name?: string;
        email: string;
    }>;
    textSignature?: string;
    htmlSignature?: string;
    mayDelete?: boolean;
};

type JmapMailbox = {
    id: string;
    name: string;
    role: string | null;
};

type JmapMethodResponse = [
    string,
    Record<string, any>,
    string,
];

function methodResponse(
    result: any,
    callId: string,
) {
    const response = (
        result.methodResponses ?? []
    ).find(
        (item: JmapMethodResponse) =>
            item[2] === callId,
    );

    if (!response) {
        throw new Error(
            `Missing JMAP response for ${callId}`,
        );
    }

    const [
        methodName,
        data,
    ] = response;

    if (methodName === "error") {
        throw new Error(
            `JMAP ${callId} failed: ${data?.type ?? "unknown error"}`,
        );
    }

    return {
        methodName,
        data,
    };
}

function normalizeMessageId(
    value: string,
) {
    return value
        .trim()
        .replace(/^<|>$/g, "");
}

export async function sendEmail(
    token: string,
    session: {
        apiUrl: string;
        uploadUrl: string;
    },
    input: JmapSendEmailInput,
): Promise<JmapSendEmailResult> {
    console.dir({
        jmapAttachments: input.attachments?.map((att) => ({
            name: att.name,
            contentType: att.contentType,
            size: att.content.size,
        })),
    });
    const discoveryResponse = await fetch(
        session.apiUrl,
        {
            method: "POST",
            headers: {
                Authorization:
                    `Bearer ${token}`,
                "Content-Type":
                    "application/json",
                Accept:
                    "application/json",
            },
            body: JSON.stringify({
                using: [
                    "urn:ietf:params:jmap:core",
                    "urn:ietf:params:jmap:mail",
                    "urn:ietf:params:jmap:submission",
                ],
                methodCalls: [
                    [
                        "Identity/get",
                        {
                            accountId:
                            input.accountId,
                        },
                        "identity-get",
                    ],
                    [
                        "Mailbox/get",
                        {
                            accountId:
                            input.accountId,
                            properties: [
                                "id",
                                "name",
                                "role",
                            ],
                        },
                        "mailbox-get",
                    ],
                ],
            }),
        },
    );

    if (!discoveryResponse.ok) {
        throw new Error(
            `JMAP send discovery failed: ${discoveryResponse.status} ${discoveryResponse.statusText}`,
        );
    }

    const discovery =
        await discoveryResponse.json();

    const identityResponse =
        methodResponse(
            discovery,
            "identity-get",
        );

    const mailboxResponse =
        methodResponse(
            discovery,
            "mailbox-get",
        );

    const identities =
        identityResponse.data
            .list as JmapIdentity[];

    const sender =
        identities.find(
            (identity) =>
                identity.email
                    .toLowerCase() ===
                input.from
                    .toLowerCase(),
        ) ??
        identities[0];

    if (!sender) {
        throw new Error(
            "No JMAP submission identity available",
        );
    }

    const remoteMailboxes =
        mailboxResponse.data
            .list as JmapMailbox[];

    const draftsMailbox =
        remoteMailboxes.find(
            (mailbox) =>
                mailbox.role ===
                "drafts",
        );

    const sentMailbox =
        remoteMailboxes.find(
            (mailbox) =>
                mailbox.role ===
                "sent",
        );

    if (!draftsMailbox) {
        throw new Error(
            "JMAP Drafts mailbox not found",
        );
    }

    if (!sentMailbox) {
        throw new Error(
            "JMAP Sent mailbox not found",
        );
    }

    const uploadedAttachments =
        await Promise.all(
            (input.attachments ?? []).map(
                async (attachment) => {
                    const uploaded =
                        await uploadBlob(
                            token,
                            session.uploadUrl,
                            input.accountId,
                            attachment.content,
                            attachment.contentType,
                        );

                    return {
                        blobId:
                        uploaded.blobId,
                        type:
                            attachment.contentType ||
                            uploaded.type ||
                            "application/octet-stream",
                        name:
                        attachment.name,
                        size:
                        uploaded.size,
                    };
                },
            ),
        );

    const emailCreateId =
        `email-${crypto.randomUUID()}`;

    const submissionCreateId =
        `submission-${crypto.randomUUID()}`;

    const bodyValues: Record<
        string,
        {
            value: string;
        }
    > = {};

    const alternativeParts: Array<
        Record<string, unknown>
    > = [];

    if (input.text) {
        bodyValues.text = {
            value: input.text,
        };

        alternativeParts.push({
            partId: "text",
            type: "text/plain",
        });
    }

    if (input.html) {
        bodyValues.html = {
            value: input.html,
        };

        alternativeParts.push({
            partId: "html",
            type: "text/html",
        });
    }

    if (!alternativeParts.length) {
        bodyValues.text = {
            value: "",
        };

        alternativeParts.push({
            partId: "text",
            type: "text/plain",
        });
    }

    const messageBody =
        alternativeParts.length === 1
            ? alternativeParts[0]
            : {
                type:
                    "multipart/alternative",
                subParts:
                alternativeParts,
            };

    const attachmentParts =
        uploadedAttachments.map(
            (attachment) => ({
                blobId:
                attachment.blobId,
                type:
                attachment.type,
                name:
                attachment.name,
                size:
                attachment.size,
                disposition:
                    "attachment",
            }),
        );

    const bodyStructure =
        attachmentParts.length
            ? {
                type:
                    "multipart/mixed",
                subParts: [
                    messageBody,
                    ...attachmentParts,
                ],
            }
            : messageBody;

    const email: Record<
        string,
        unknown
    > = {
        mailboxIds: {
            [draftsMailbox.id]:
                true,
        },
        keywords: {
            "$draft": true,
        },
        from: [
            {
                email:
                sender.email,
                name:
                    sender.name ||
                    undefined,
            },
        ],
        to: input.to.map(
            (email) => ({
                email,
            }),
        ),
        subject:
        input.subject,
        bodyStructure,
        bodyValues,
    };

    if (input.inReplyTo) {
        email[
            "header:In-Reply-To:asMessageIds"
            ] = [
            normalizeMessageId(
                input.inReplyTo,
            ),
        ];
    }

    if (
        input.references?.length
    ) {
        email[
            "header:References:asMessageIds"
            ] =
            input.references
                .filter(Boolean)
                .map(
                    normalizeMessageId,
                );
    }

    const response = await fetch(
        session.apiUrl,
        {
            method: "POST",
            headers: {
                Authorization:
                    `Bearer ${token}`,
                "Content-Type":
                    "application/json",
                Accept:
                    "application/json",
            },
            body: JSON.stringify({
                using: [
                    "urn:ietf:params:jmap:core",
                    "urn:ietf:params:jmap:mail",
                    "urn:ietf:params:jmap:submission",
                ],
                methodCalls: [
                    [
                        "Email/set",
                        {
                            accountId:
                            input.accountId,
                            create: {
                                [emailCreateId]:
                                email,
                            },
                        },
                        "email-set",
                    ],
                    [
                        "EmailSubmission/set",
                        {
                            accountId:
                            input.accountId,
                            create: {
                                [submissionCreateId]:
                                    {
                                        identityId:
                                        sender.id,
                                        emailId:
                                            `#${emailCreateId}`,
                                    },
                            },
                            onSuccessUpdateEmail:
                                {
                                    [`#${submissionCreateId}`]:
                                        {
                                            mailboxIds:
                                                {
                                                    [sentMailbox.id]:
                                                        true,
                                                },
                                            "keywords/$draft":
                                                null,
                                        },
                                },
                        },
                        "submission-set",
                    ],
                ],
            }),
        },
    );

    if (!response.ok) {
        throw new Error(
            `JMAP send failed: ${response.status} ${response.statusText}`,
        );
    }

    const result =
        await response.json();

    const emailSet =
        methodResponse(
            result,
            "email-set",
        ).data;

    const submissionSet =
        methodResponse(
            result,
            "submission-set",
        ).data;

    const emailError =
        emailSet.notCreated?.[
            emailCreateId
            ];

    if (emailError) {
        throw new Error(
            `JMAP Email/set failed: ${emailError.type ?? "unknown error"}${
                emailError.description
                    ? ` - ${emailError.description}`
                    : ""
            }`,
        );
    }

    const submissionError =
        submissionSet.notCreated?.[
            submissionCreateId
            ];

    if (submissionError) {
        throw new Error(
            `JMAP EmailSubmission/set failed: ${submissionError.type ?? "unknown error"}${
                submissionError.description
                    ? ` - ${submissionError.description}`
                    : ""
            }`,
        );
    }

    const createdEmail =
        emailSet.created?.[
            emailCreateId
            ];

    const createdSubmission =
        submissionSet.created?.[
            submissionCreateId
            ];

    if (!createdEmail?.id) {
        throw new Error(
            "JMAP Email/set did not return an email id",
        );
    }

    if (!createdSubmission?.id) {
        throw new Error(
            "JMAP EmailSubmission/set did not return a submission id",
        );
    }

    const getResponse = await fetch(
        session.apiUrl,
        {
            method: "POST",
            headers: {
                Authorization:
                    `Bearer ${token}`,
                "Content-Type":
                    "application/json",
                Accept:
                    "application/json",
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
                            accountId:
                            input.accountId,
                            ids: [
                                createdEmail.id,
                            ],
                            properties: [
                                "id",
                                "messageId",
                            ],
                        },
                        "sent-email-get",
                    ],
                ],
            }),
        },
    );

    if (!getResponse.ok) {
        throw new Error(
            `JMAP sent Email/get failed: ${getResponse.status} ${getResponse.statusText}`,
        );
    }

    const getResult =
        await getResponse.json();

    const sentEmail =
        methodResponse(
            getResult,
            "sent-email-get",
        ).data
            ?.list?.[0];

    const messageId =
        sentEmail?.messageId?.[0] ??
        createdEmail.id;

    return {
        emailId:
        createdEmail.id,
        submissionId:
        createdSubmission.id,
        messageId,
    };
}
