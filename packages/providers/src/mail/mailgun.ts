// @ts-nocheck
import {
	DomainIdentity,
	Mailer,
	MailgunConfig,
	RawMailgunConfigSchema,
	VerifyResult,
} from "../core";
import sgClient from "@sendgrid/client";
import { sanitizeFilename } from "@common/mail-client";
import Mailgun from "mailgun.js";

export class MailgunMailer implements Mailer {
	private client: sgClient.Client;
	private cfg: MailgunConfig;

	private constructor(cfg: MailgunConfig) {
		this.cfg = cfg;
		const mailgun = new Mailgun(FormData);
		this.client = mailgun.client({
			username: "api",
			key: cfg.mailgunApiKey,
			url:
				cfg.region === "eu"
					? "https://api.eu.mailgun.net"
					: "https://api.mailgun.net",
		});
	}

	static from(raw: unknown): MailgunMailer {
		const cfg = RawMailgunConfigSchema.parse(raw);
		return new MailgunMailer(cfg);
	}

	async verify(): Promise<VerifyResult> {
		try {
			await this.client.domains.list();
			return {
				ok: true,
				message: "OK",
				meta: { provider: "sendgrid", send: true },
			};
		} catch (err: any) {
			return {
				ok: false,
				message: err?.message ?? "Mailgun verify failed",
				meta: { status: err?.status, details: err?.details },
			};
		}
	}

	async sendTestEmail(
		to: string,
		opts?: { subject?: string; body?: string; from?: string },
	): Promise<boolean> {
		try {
			const domain = opts.from.split("@")[1];

			await this.client.messages.create(domain, {
				from: opts?.from ?? "no-reply@kurrier.org",
				to,
				subject: opts?.subject ?? "Test email",
				text:
					opts?.body ??
					"This is a test email from your configured Mailgun provider.",
			});

			return true;
		} catch (err) {
			return false;
		}
	}

	// Mailgun: add a domain and return DNS to set
	async addDomain(
		domain: string,
		opts: Record<string, any> = {},
	): Promise<DomainIdentity> {
		const d = this.normalizeDomain(domain);

		try {
			// Create the domain. Common opts you might allow:
			// - smtp_password: string (otherwise Mailgun generates one)
			// - spam_action: "disabled" | "block"  (default: "disabled")
			// - wildcard: boolean (catch-all subdomains)
			const res: any = await this.client.domains.create({
				name: d,
				spam_action: "tag",
			});

			// Map DNS records (sending + receiving)
			const dns: DnsRecord[] = [];

			for (const rec of res.sending_dns_records ?? []) {
				dns.push({
					type: String(rec.record_type || "").toUpperCase() as DnsType, // TXT / CNAME
					name: rec.name,
					value: rec.value,
					note: `sending (${rec.valid ? "valid" : "pending"})`,
				});
			}

			for (const rec of res.receiving_dns_records ?? []) {
				dns.push({
					type: String(rec.record_type || "").toUpperCase() as DnsType, // MX
					name: rec.name,
					value: rec.value,
					priority: rec.priority,
					note: `receiving (${rec.valid ? "valid" : "pending"})`,
				});
			}

			// Mailgun domain states: "unverified" | "active" | ...
			const state = res.domain?.state ?? "unverified";
			const status: IdentityStatus =
				state === "active" ? "verified" : "unverified";

			return {
				domain: res.domain?.name ?? d, // e.g. "mg.kurrier.org"
				status,
				dns,
				meta: {
					mailgun_raw: JSON.parse(JSON.stringify(res)),
				},
			};
		} catch (err: any) {
			return {
				domain: d,
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
		try {
			const [listRes] = await this.client.request({
				method: "GET",
				url: "/v3/user/webhooks/parse/settings",
			});
			const all: any[] = listRes.body.result ?? [];
			const parse = all.find(
				(s) => s.hostname?.toLowerCase() === domain.toLowerCase(),
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
			const dom = all.find((x) => this.normalizeDomain(x.domain) === domain);
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
			domain: domain,
			status: "unverified", // since it’s gone, treat as unverified
			dns: [],
			meta: { deleted: true },
		};
	}

	async verifyDomain(
		domain: string,
		opts: Record<any, any> = {},
	): Promise<DomainIdentity> {
		const d = this.normalizeDomain(domain);
		const webHookUrl = opts?.webHookUrl as string | undefined;

		try {
			const res: any = await this.client.domains.verify(d);

			const dns: DnsRecord[] = [];
			for (const rec of res.sending_dns_records ?? []) {
				dns.push({
					type: String(rec.record_type || "").toUpperCase() as DnsType,
					name: rec.name,
					value: rec.value,
					note: `sending (${rec.valid ? "valid" : "pending"})`,
				});
			}
			for (const rec of res.receiving_dns_records ?? []) {
				dns.push({
					type: String(rec.record_type || "").toUpperCase() as DnsType,
					name: rec.name,
					value: rec.value,
					priority: rec.priority,
					note: `receiving (${rec.valid ? "valid" : "pending"})`,
				});
			}

			const isActive = res.state === "active";
			const status: IdentityStatus = isActive ? "verified" : "unverified";

			// If verified and a webhook URL was provided, upsert a catch-all inbound Route.
			if (isActive && webHookUrl) {
				await this.upsertInboundRoute(d, webHookUrl);
			}

			return {
				domain: res.domain?.name ?? d,
				status,
				dns,
				meta: { mailgun_raw: JSON.parse(JSON.stringify(res)) },
			};
		} catch (e: any) {
			return {
				domain: d,
				status: "failed",
				dns: [],
				meta: { error: e?.message ?? String(e) },
			};
		}
	}

	private async upsertInboundRoute(domain: string, webhookUrl: string) {
		const expr = `match_recipient(".*@${domain}")`;

		try {
			const list: any = await this.client.routes.list();
			const all: any[] = list ?? [];

			for (const r of all) {
				await this.client.routes.destroy(r.id);
				console.log(`Deleted old route ${r.id} for ${domain}`);
			}

			const created = await this.client.routes.create({
				priority: "1",
				description: `Catch-all for ${domain}`,
				expression: expr,
				action: [`forward("${webhookUrl}")`, "stop()"],
			});

			return { id: created.id, created: true };
		} catch (e: any) {
			console.error("upsertInboundRoute error", e?.message ?? e);
			throw e;
		}
	}

	async addEmail() {
		return {} as any;
	}

	async removeDomain(domain: string): Promise<DomainIdentity> {
		try {
			const routes = await this.client.routes.list();
			const all: any[] = routes ?? [];

			for (const r of all) {
				if (r.expression?.includes(domain)) {
					await this.client.routes.destroy(r.id);
					console.log(`Deleted route ${r.id} for domain ${domain}`);
				}
			}
		} catch (e) {
			console.warn("removeDomain: inbound routes delete error", e);
		}

		try {
			await this.client.domains.destroy(domain);
			console.log(`Deleted Mailgun domain ${domain}`);
		} catch (e) {
			console.warn("removeDomain: domain delete error", e);
		}

		return {
			domain: domain,
			status: "unverified",
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
	): Promise<{ success: boolean; MessageId?: string }> {
		try {
			const domain = String(opts.from.split("@")[1] || "").trim();

			const mgAttachments =
				opts.attachments && opts.attachments.length
					? await Promise.all(
							opts.attachments.map(async (a) => ({
								filename: sanitizeFilename(a.name),
								data: Buffer.from(await a.content.arrayBuffer()),
								contentType: a.contentType || "application/octet-stream",
							})),
						)
					: undefined;

			// Mailgun custom headers use the "h:" prefix
			const headers: Record<string, string> = {};
			if (opts.inReplyTo) headers["h:In-Reply-To"] = opts.inReplyTo;
			if (opts.references?.length)
				headers["h:References"] = opts.references.join(" ");

			// Mailgun accepts string or array for "to"
			const payload: any = {
				from: opts.from,
				to, // array is fine
				subject: opts.subject,
				text: opts.text || undefined,
				html: opts.html || undefined,
				// headers
				...headers,
			};

			if (mgAttachments) {
				payload.attachment = mgAttachments; // one or many
			}

			const res = await this.client.messages.create(domain, payload);
			const id =
				typeof res?.id === "string" ? res.id.replace(/^<|>$/g, "") : undefined;

			return { success: true, MessageId: id };
		} catch (err) {
			console.error("mailgun sendEmail error", err);
			return { success: false };
		}
	}
}
