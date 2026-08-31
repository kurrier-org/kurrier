import MailComposer from "nodemailer/lib/mail-composer/index.js";
import {
    DomainIdentity,
    EmailIdentity,
    Mailer,
    RawGoogleConfigSchema,
    VerifyResult,
} from "../core";
import {gmailClientForIdentity} from "./google-client";

type GoogleMailerConfig = {
    identityId: string;
};


function encodeBase64Url(input: Buffer | string) {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

export class GoogleMailer implements Mailer {
    private identityId: string;

    private constructor(cfg: GoogleMailerConfig) {
        this.identityId = cfg.identityId;
    }

    static from(raw: unknown): GoogleMailer {
        const cfg = RawGoogleConfigSchema.parse(raw);
        return new GoogleMailer(cfg);
    }

    async verify(id?: string): Promise<VerifyResult> {
        const identityId = id || this.identityId;
        let markError: undefined | ((message: string) => Promise<void>);

        try {
            const client = await gmailClientForIdentity(identityId);
            const { gmail, googleAccount, markConnected } = client;
            markError = client.markError;

            const profile = await gmail.users.getProfile({ userId: "me" });

            await markConnected?.();

            return {
                ok: true,
                message: "Google account connected",
                meta: {
                    email: profile.data.emailAddress ?? googleAccount.email,
                    historyId: profile.data.historyId ?? null,
                    messagesTotal: profile.data.messagesTotal ?? null,
                    threadsTotal: profile.data.threadsTotal ?? null,
                },
            };
        } catch (err: any) {
            const message = err?.message ?? "Google verify failed";
            await markError?.(message);

            return {
                ok: false,
                message,
                meta: {
                    code: err?.code,
                    status: err?.status,
                },
            };
        }
    }

    async sendTestEmail(
        to: string,
        opts?: { subject?: string; body?: string; from?: string },
    ): Promise<boolean> {
        const result = await this.sendEmail([to], {
            from: opts?.from ?? "",
            subject: opts?.subject ?? "Test email",
            text: opts?.body ?? "This is a test email from your Google account.",
            html: opts?.body ?? "This is a test email from your Google account.",
            inReplyTo: "",
            references: [],
        });

        return result.success;
    }

    async sendEmail(
        to: string[],
        opts: {
            subject: string;
            text: string;
            html: string;
            cc?: string[];
            bcc?: string[];
            from: string;
            inReplyTo: string;
            references: string[];
            attachments?: { name: string; content: Blob; contentType: string }[];
        },
    ): Promise<{ success: boolean; MessageId?: string; error?: string }> {
        try {
            const { gmail, googleAccount } = await gmailClientForIdentity(
                this.identityId,
            );

            const attachments = await Promise.all(
                (opts.attachments ?? []).map(async (a) => ({
                    filename: a.name,
                    content: Buffer.from(await a.content.arrayBuffer()),
                    contentType: a.contentType || "application/octet-stream",
                })),
            );

            const headers: Record<string, string> = {};
            if (opts.inReplyTo) headers["In-Reply-To"] = opts.inReplyTo;
            if (opts.references?.length) {
                headers.References = opts.references.join(" ");
            }

            const composer = new MailComposer({
                from: opts.from || googleAccount.email,
                to,
                cc: opts.cc?.length ? opts.cc : undefined,
                bcc: opts.bcc?.length ? opts.bcc : undefined,
                subject: opts.subject,
                text: opts.text || undefined,
                html: opts.html || undefined,
                headers,
                attachments,
            });

            const message = await composer.compile().build();

            const sent = await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: encodeBase64Url(message),
                },
            });

            return {
                success: true,
                MessageId: sent.data.id ?? undefined,
            };
        } catch (err: any) {
            return {
                success: false,
                error: err?.message ?? "Gmail send failed",
            };
        }
    }

    async addDomain(domain: string): Promise<DomainIdentity> {
        return {
            domain,
            status: "unverified",
            dns: [],
            meta: { info: "Google provider does not support domain provisioning here" },
        };
    }

    async removeDomain(domain: string): Promise<DomainIdentity> {
        return {
            domain,
            status: "unverified",
            dns: [],
            meta: { info: "Google provider does not support domain removal here" },
        };
    }

    async verifyDomain(domain: string): Promise<DomainIdentity> {
        return {
            domain,
            status: "unverified",
            dns: [],
            meta: { info: "Google provider does not support domain verification here" },
        };
    }

    async addEmail(email: string): Promise<EmailIdentity> {
        return {
            address: email,
            ruleName: "",
            ruleSetName: "",
            created: false,
            slug: email.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        };
    }

    async removeEmail(
        email: string,
        opts?: { revoke?: boolean },
    ): Promise<{ removed: boolean }> {
        try {
            const { oauth2Client, googleAccount } =
                await gmailClientForIdentity(this.identityId);

            if (opts?.revoke) {
                const token = oauth2Client.credentials.refresh_token;

                if (token) {
                    await oauth2Client.revokeToken(token);
                }
            }

            return {
                removed:
                    googleAccount.email.toLowerCase() === email.toLowerCase(),
            };
        } catch (err) {
            console.error("Google removeEmail failed", err);
            return { removed: false };
        }
    }
}
