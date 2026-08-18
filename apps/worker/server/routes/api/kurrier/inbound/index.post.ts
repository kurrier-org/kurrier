import {
    db,
    identities,
    mailboxes,
    providers,
} from "@db";
import { and, eq } from "drizzle-orm";
import {
    defineEventHandler,
    getHeader,
    readRawBody,
} from "h3";
import { v4 as uuidv4 } from "uuid";

import {
    apiError,
    apiSuccess,
    validateApiKey,
} from "../../../../../lib/api-helpers";
import { parseAndStoreEmail } from "../../../../../lib/message-payload-parser";

export default defineEventHandler(async (event) => {
    const identityId = getHeader(event, "x-kurrier-identity");

    if (!identityId) {
        return apiError(
            400,
            "IDENTITY_REQUIRED",
            "X-Kurrier-Identity header is required",
        );
    }

    const { apiKey } = await validateApiKey(event);

    const [row] = await db
        .select({
            identity: identities,
            provider: providers,
        })
        .from(identities)
        .innerJoin(
            providers,
            eq(identities.providerId, providers.id),
        )
        .where(
            and(
                eq(identities.id, identityId),
                eq(identities.workspaceId, apiKey.workspaceId),
                eq(providers.type, "inbound"),
            ),
        )
        .limit(1);

    if (!row) {
        return apiError(
            404,
            "INBOUND_IDENTITY_NOT_FOUND",
            "Inbound identity not found",
        );
    }

    const rawEmail =
        (await readRawBody(event, false))?.toString("utf8") ?? "";

    if (!rawEmail.length) {
        return apiError(
            400,
            "EMPTY_MESSAGE",
            "Raw RFC822/EML body is required",
        );
    }

    const [inbox] = await db
        .select()
        .from(mailboxes)
        .where(
            and(
                eq(mailboxes.identityId, row.identity.id),
                eq(mailboxes.kind, "inbox"),
            ),
        )
        .limit(1);

    if (!inbox) {
        return apiError(
            500,
            "INBOX_NOT_FOUND",
            "Inbox not found for inbound identity",
        );
    }

    const emlId = uuidv4();
    const rawStorageKey = `eml/${row.identity.ownerId}/${emlId}`;

    const message = await parseAndStoreEmail(rawEmail, {
        ownerId: row.identity.ownerId,
        workspaceId: row.identity.workspaceId,
        mailboxId: inbox.id,
        rawStorageKey,
        emlKey: emlId,
    });

    return apiSuccess({
        identity: {
            id: row.identity.publicId,
            value: row.identity.value,
        },
        message,
    });
});
