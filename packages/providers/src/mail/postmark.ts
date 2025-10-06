// @ts-nocheck
import {
	DomainIdentity,
	Mailer,
	MailgunConfig,
	PostmarkConfig,
	RawPostmarkConfigSchema,
	VerifyResult,
} from "../core";
import postmark from "postmark";
import { sanitizeFilename } from "@common/mail-client";

export class PostmarkMailer implements Mailer {
	private accountClient: postmark.AccountClient;
	private serverClient: postmark.ServerClient;
	private cfg: MailgunConfig;

	private constructor(cfg: PostmarkConfig) {
		this.cfg = cfg;
		this.serverClient = new postmark.ServerClient(cfg.postmarkServerToken);
		this.accountClient = new postmark.AccountClient(cfg.postmarkAccountToken);
	}

	static from(raw: unknown): PostmarkMailer {
		const cfg = RawPostmarkConfigSchema.parse(raw);
		return new PostmarkMailer(cfg);
	}

	async verify(): Promise<VerifyResult> {
		try {
			const server = await this.serverClient.getServer();

			return {
				ok: true,
				message: "Postmark server verified",
				meta: {
					provider: "postmark",
					send: true,
					serverId: server.ID,
					serverName: server.Name,
				},
			};
		} catch (err: any) {
			return {
				ok: false,
				message: err?.message ?? "Postmark verify failed",
				meta: { status: err?.status, details: err },
			};
		}
	}

	async sendTestEmail(
		to: string,
		opts?: { subject?: string; body?: string; from?: string },
	): Promise<boolean> {
		try {
			await this.serverClient.sendEmail({
				From: opts?.from ?? "no-reply@kurrier.org",
				To: to,
				Subject: opts?.subject ?? "Test email",
				TextBody:
					opts?.body ??
					"This is a test email from your configured Postmark provider.",
			});

			return true;
		} catch (err) {
			console.error("Postmark sendTestEmail error", err);
			return false;
		}
	}

	async addDomain(
		domain: string,
		opts: Record<string, any> = {},
	): Promise<DomainIdentity> {
		try {
			const list = await this.accountClient.getDomains();
			let match = list.Domains.find(
				(dom) => dom.Name.toLowerCase() === domain.toLowerCase(),
			);
			let created = false;

			if (!match) {
				const createdDom = await this.accountClient.createDomain({
					Name: domain,
					...(opts.returnPathDomain
						? { ReturnPathDomain: this.normalizeDomain(opts.returnPathDomain) }
						: {}),
				});
				created = true;
				match = { ID: createdDom.ID, Name: createdDom.Name } as any;
			}

			const details = await this.accountClient.getDomain(match!.ID);

			const dns: DnsRecord[] = [];

			dns.push({
				type: "MX",
				name: domain,
				value: "inbound.postmarkapp.com",
				note: `MX (for inbound email)`,
			});
			// SPF TXT
			if (details.SPFHost && details.SPFTextValue) {
				dns.push({
					type: "TXT",
					name: details.SPFHost,
					value: details.SPFTextValue,
					note: `SPF (${details.SPFVerified ? "valid" : "pending"})`,
				});
			}

			// DKIM (current) TXT
			if (details.DKIMHost && details.DKIMTextValue) {
				dns.push({
					type: "TXT",
					name: details.DKIMHost,
					value: details.DKIMTextValue,
					note: `DKIM (${details.DKIMVerified ? "valid" : "pending"})`,
				});
			}

			// DKIM (pending) TXT – Postmark provides a separate pending key when rotating/initializing
			if (details.DKIMPendingHost && details.DKIMPendingTextValue) {
				dns.push({
					type: "TXT",
					name: details.DKIMPendingHost,
					value: details.DKIMPendingTextValue,
					note: `DKIM (pending)`,
				});
			}

			// DKIM (revoked) TXT – show it so users know what can be removed
			if (details.DKIMRevokedHost && details.DKIMRevokedTextValue) {
				dns.push({
					type: "TXT",
					name: details.DKIMRevokedHost,
					value: details.DKIMRevokedTextValue,
					note: `DKIM (revoked${details.SafeToRemoveRevokedKeyFromDNS ? ", safe to remove" : ""})`,
				});
			}

			// Return-Path CNAME
			if (details.ReturnPathDomain && details.ReturnPathDomainCNAMEValue) {
				dns.push({
					type: "CNAME",
					name: details.ReturnPathDomain,
					value: details.ReturnPathDomainCNAMEValue,
					note: `Return-Path (${details.ReturnPathDomainVerified ? "valid" : "pending"})`,
				});
			}

			// overall status: Postmark considers domain verified for sending when SPF & DKIM are verified
			const status: IdentityStatus =
				details.SPFVerified && details.DKIMVerified ? "verified" : "unverified";

			return {
				domain: details.Name,
				status,
				dns,
				meta: {
					postmark_raw: details,
					created,
					id: details.ID,
					dkimUpdateStatus: details.DKIMUpdateStatus,
					weakDkim: details.WeakDKIM,
					safeToRemoveRevokedKey: details.SafeToRemoveRevokedKeyFromDNS,
				},
			};
		} catch (err: any) {
			return {
				domain: domain,
				status: "failed",
				dns: [],
				meta: { error: err?.message ?? String(err) },
			};
		}
	}

	private normalizeDomain(d: string) {
		return d.trim().replace(/\.$/, "").toLowerCase();
	}

	async removeDomain(domain: string): Promise<DomainIdentity> {
		const d = this.normalizeDomain(domain);

		try {
			const [listRes] = await this.client.request({
				method: "GET",
				url: "/v3/user/webhooks/parse/settings",
			});
			const all: any[] = listRes.body.result ?? [];
			const parse = all.find(
				(s) => s.hostname?.toLowerCase() === d.toLowerCase(),
			);
			if (parse) {
				await this.client.request({
					method: "DELETE",
					url: `/v3/user/webhooks/parse/settings/${parse.id}`,
				});
			}
		} catch (e) {
			console.warn("removeDomain: inbound parse delete error", e);
		}

		try {
			const [listRes] = await this.client.request({
				method: "GET",
				url: "/v3/whitelabel/domains",
			});
			const all: any[] = listRes.body ?? [];
			const dom = all.find((x) => this.normalizeDomain(x.domain) === d);
			if (dom) {
				await this.client.request({
					method: "DELETE",
					url: `/v3/whitelabel/domains/${dom.id}`,
				});
			}
		} catch (e) {
			console.warn("removeDomain: domain delete error", e);
		}

		return {
			domain: d,
			status: "unverified", // since it’s gone, treat as unverified
			dns: [],
			meta: { deleted: true },
		};
	}

	async verifyDomain(
		domain: string,
		opts: { webHookUrl?: string } = {},
	): Promise<DomainIdentity> {
		// const d = this.normalizeDomain(domain);
		const hook = opts.webHookUrl?.trim();

		try {
			// 1) Find the domain in the account
			const list = await this.accountClient.getDomains();
			const match = list.Domains.find(
				(x) => x.Name.toLowerCase() === domain.toLowerCase(),
			);

			if (!match) {
				return {
					domain: domain,
					status: "unverified",
					dns: [],
					meta: { error: "Domain not found in Postmark account." },
				};
			}

			// 2) Get full details (SPF, DKIM, Return-Path)
			const details = await this.accountClient.getDomain(match.ID);

			const dns: DnsRecord[] = [];

			dns.push({
				type: "MX",
				name: domain,
				value: "inbound.postmarkapp.com",
				note: `MX (for inbound email)`,
			});

			// SPF (TXT)
			if (details.SPFHost && details.SPFTextValue) {
				dns.push({
					type: "TXT",
					name: details.SPFHost,
					value: details.SPFTextValue,
					note: `SPF (${details.SPFVerified ? "valid" : "pending"})`,
				});
			}

			// DKIM (TXT): prefer active, else show pending DKIM record
			if (details.DKIMHost && details.DKIMTextValue) {
				dns.push({
					type: "TXT",
					name: details.DKIMHost,
					value: details.DKIMTextValue,
					note: `DKIM (${details.DKIMVerified ? "valid" : "pending"})`,
				});
			} else if (details.DKIMPendingHost && details.DKIMPendingTextValue) {
				dns.push({
					type: "TXT",
					name: details.DKIMPendingHost,
					value: details.DKIMPendingTextValue,
					note: "DKIM (pending)",
				});
			}

			// Return-Path (CNAME)
			if (details.ReturnPathDomain && details.ReturnPathDomainCNAMEValue) {
				dns.push({
					type: "CNAME",
					name: details.ReturnPathDomain,
					value: details.ReturnPathDomainCNAMEValue,
					note: `Return-Path (${details.ReturnPathDomainVerified ? "valid" : "pending"})`,
				});
			}

			const isVerified = !!(details.SPFVerified && details.DKIMVerified);
			const status: IdentityStatus = isVerified ? "verified" : "unverified";

			// 3) If verified and a webhook URL is supplied, configure inbound on the Server
			//    (This is the Postmark way; there are no per-domain inbound routes.)
			let inboundConfigured: { updated?: boolean } | undefined;
			if (isVerified && hook) {
				const server = await this.serverClient.getServer();
				const res = await this.serverClient.editServer({
					Name: server.Name,
					InboundHookUrl: hook,
					InboundDomain: server.InboundDomain || domain,
					RawEmailEnabled: true,
				});
				inboundConfigured = { updated: true };
			}

			return {
				domain: details.Name,
				status,
				dns,
				meta: {
					postmark_raw: details,
					inboundConfigured,
				},
			};
		} catch (err: any) {
			return {
				domain: domain,
				status: "failed",
				dns: [],
				meta: { error: err?.message ?? String(err) },
			};
		}
	}

	async addEmail() {
		return {} as any;
	}

	async removeDomain(domain: string): Promise<DomainIdentity> {
		try {
			const domains = await this.accountClient.getDomains();
			const match = domains.Domains.find(
				(d) => d.Name.toLowerCase() === domain.toLowerCase(),
			);

			if (match) {
				await this.accountClient.deleteDomain(match.ID);
				console.log(`Deleted Postmark domain ${domain} (ID=${match.ID})`);
			} else {
				console.warn(`Domain ${domain} not found in Postmark account`);
			}
		} catch (e) {
			console.warn("removeDomain: domain delete error", e);
		}

		return {
			domain,
			status: "unverified", // treat as removed
			dns: [],
			meta: { deleted: true },
		};
	}

	async removeEmail() {
		return {} as any;
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
			attachments?: { name: string; content: Blob; contentType: string }[];
		},
	): Promise<{ success: boolean; MessageId?: string; error?: string }> {
		try {
			const Attachments =
				opts.attachments && opts.attachments.length
					? await Promise.all(
							opts.attachments.map(async (a) => ({
								Name: sanitizeFilename(a.name),
								Content: Buffer.from(await a.content.arrayBuffer()).toString(
									"base64",
								),
								ContentType: a.contentType || "application/octet-stream",
								// (optional) ContentID: "<cid>" for inline images
							})),
						)
					: undefined;

			// Postmark custom headers use [{ Name, Value }]
			const Headers: Array<{ Name: string; Value: string }> = [];
			if (opts.inReplyTo)
				Headers.push({ Name: "In-Reply-To", Value: opts.inReplyTo });
			if (opts.references?.length)
				Headers.push({ Name: "References", Value: opts.references.join(" ") });

			const res = await this.serverClient.sendEmail({
				From: opts.from,
				To: to.join(","), // Postmark accepts comma-separated list
				Subject: opts.subject,
				TextBody: opts.text || undefined,
				HtmlBody: opts.html || undefined,
				Headers: Headers.length ? Headers : undefined,
				Attachments,
				// MessageStream: "outbound",  // optionally set a specific stream
				// TrackOpens: true,           // optional tracking flags
			});

			// Postmark returns { MessageID, ErrorCode, Message, ... }
			if (res.ErrorCode && res.ErrorCode !== 0) {
				console.error("Postmark sendEmail error", res);
				return { success: false, error: res.Message || "Postmark send error" };
			}
			return { success: true, MessageId: String(res.MessageID) };
		} catch (err) {
			console.error("Postmark sendEmail exception", err);
			return {
				success: false,
				error: err?.message ?? "Postmark send exception",
			};
		}
	}
}
