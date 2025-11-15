import {H3Event, createError, readRawBody} from "h3";
import {db, apiKeys, secretsMeta, getSecretAdmin} from "@db";
import { eq, and } from "drizzle-orm";


export function apiSuccess(data: any = null) {
    return {
        success: true,
        data
    };
}

export function apiError(
    statusCode: number,
    code: string,
    message: string,
    issues?: any,
) {
    throw createError({
        statusCode,
        statusMessage: message,
        data: {
            success: false,
            error: {
                code,
                message,
                issues,
            },
        },
    });
}

export async function validateJSONBody(event: H3Event) {
    const raw = (await readRawBody(event)) || "";
    let json: any;
    try {
        json = JSON.parse(raw);
    } catch (e) {
        throw createError({
            statusCode: 400,
            statusMessage: "Invalid JSON in request body",
        });
    }

    return { raw, json };
}


export async function validateApiKey(event: H3Event) {
    const auth = event.node.req.headers["authorization"];

    if (!auth || !auth.startsWith("Bearer ")) {
        throw createError({
            statusCode: 401,
            statusMessage: "Missing or invalid Authorization header",
        });
    }

    const token = auth.replace("Bearer ", "").trim();

    const parts = token.split(".");
    if (parts.length < 2) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid API key format",
        });
    }

    const prefix = parts[0];
    const rest = parts[1] ?? "";
    const last4 = rest.slice(-4);

    if (!prefix || last4.length !== 4) {
        throw createError({
            statusCode: 401,
            statusMessage: "Invalid API key format",
        });
    }

    const rows = await db
        .select()
        .from(apiKeys)
        .where(
            and(
                eq(apiKeys.keyPrefix, prefix),
                eq(apiKeys.keyLast4, last4)
            )
        );

    const key = rows[0];
    if (!key) {
        throw createError({
            statusCode: 401,
            statusMessage: "API key not found",
        });
    }

    if (key.revokedAt) {
        throw createError({
            statusCode: 401,
            statusMessage: "API key has been revoked",
        });
    }

    const [secretMeta] = await db
        .select()
        .from(secretsMeta)
        .where(eq(secretsMeta.id, key.secretId));

    let actualSecret = null;

    if (secretMeta) {
        actualSecret = await getSecretAdmin(secretMeta.id);
        if (!actualSecret) {
            throw createError({
                statusCode: 401,
                statusMessage: "API key secret not found",
            });
        }
    }

    return {
        apiKey: key,
        secret: actualSecret,
        ownerId: key.ownerId,
    };
}
