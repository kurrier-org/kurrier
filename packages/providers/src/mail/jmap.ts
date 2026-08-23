import {
    DomainIdentity,
    EmailIdentity,
    JmapConfig,
    Mailer,
    RawJmapConfigSchema,
    VerifyResult,
} from "../core";

import { JmapClient } from "@jmap";

export class JmapMailer implements Mailer {
    private readonly client: JmapClient;
    private readonly accountId: string;
    private readonly username: string;

    private constructor(cfg: JmapConfig) {
        this.client = new JmapClient(
            cfg.token,
            cfg.sessionUrl,
        );

        this.accountId = cfg.accountId;
        this.username = cfg.username;
    }

    static from(raw: unknown): JmapMailer {
        const cfg = RawJmapConfigSchema.parse(raw);
        return new JmapMailer(cfg);
    }

    async verify(): Promise<VerifyResult> {
        try {
            const session = await this.client.getSession();

            if (!session.accounts[this.accountId]) {
                return {
                    ok: false,
                    message: "JMAP account not found",
                    meta: {
                        accountId: this.accountId,
                    },
                };
            }

            return {
                ok: true,
                message: "JMAP account connected",
                meta: {
                    username: this.username,
                    accountId: this.accountId,
                    apiUrl: session.apiUrl,
                },
            };
        } catch (err: any) {
            return {
                ok: false,
                message: err?.message ?? "JMAP verify failed",
                meta: {
                    code: err?.code,
                    status: err?.status,
                },
            };
        }
    }

    async sendTestEmail(
        to: string,
        opts?: {
            subject?: string;
            body?: string;
            from?: string;
        },
    ): Promise<boolean> {
        const result = await this.sendEmail(
            [to],
            {
                from: opts?.from || this.username,
                subject: opts?.subject ?? "Test email",
                text:
                    opts?.body ??
                    "This is a test email from your JMAP account.",
                html:
                    opts?.body ??
                    "This is a test email from your JMAP account.",
                inReplyTo: "",
                references: [],
            },
        );

        return result.success;
    }

    async sendEmail(
        to: string[],
        opts: {
            subject: string;
            text: string;
            html: string;
            from: string;
            inReplyTo: string;
            references: string[];
            attachments?: {
                name: string;
                content: Blob;
                contentType: string;
            }[];
        },
    ): Promise<{
        success: boolean;
        MessageId?: string;
        error?: string;
    }> {
        try {
            const result = await this.client.sendEmail({
                accountId: this.accountId,
                from: opts.from || this.username,
                to,
                subject: opts.subject,
                text: opts.text,
                html: opts.html,
                inReplyTo:
                    opts.inReplyTo || undefined,
                references:
                    opts.references?.length
                        ? opts.references
                        : undefined,
                attachments:
                opts.attachments,
            });

            return {
                success: true,
                MessageId: result.messageId,
            };
        } catch (err: any) {
            return {
                success: false,
                error:
                    err?.message ??
                    "JMAP send failed",
            };
        }
    }

    async addDomain(
        domain: string,
    ): Promise<DomainIdentity> {
        return {
            domain,
            status: "unverified",
            dns: [],
            meta: {
                info: "JMAP does not provide domain provisioning",
            },
        };
    }

    async removeDomain(
        domain: string,
    ): Promise<DomainIdentity> {
        return {
            domain,
            status: "unverified",
            dns: [],
            meta: {
                info: "JMAP does not provide domain removal",
            },
        };
    }

    async verifyDomain(
        domain: string,
    ): Promise<DomainIdentity> {
        return {
            domain,
            status: "unverified",
            dns: [],
            meta: {
                info: "JMAP does not provide domain verification",
            },
        };
    }

    async addEmail(
        email: string,
    ): Promise<EmailIdentity> {
        return {
            address: email,
            ruleName: "",
            ruleSetName: "",
            created: false,
            slug: email
                .toLowerCase()
                .replace(
                    /[^a-z0-9]+/g,
                    "-",
                ),
        };
    }

    async removeEmail(
        _email: string,
        _opts?: Record<string, any>,
    ): Promise<{
        removed: boolean;
    }> {
        return {
            removed: false,
        };
    }
}
