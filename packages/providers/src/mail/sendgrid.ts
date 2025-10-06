// @ts-nocheck
import {
	DomainIdentity,
	Mailer,
	RawSendgridConfigSchema,
	SendgridConfig,
	VerifyResult,
} from "../core";
import sgClient from "@sendgrid/client";
import sgMail from "@sendgrid/mail";
import { sanitizeFilename } from "@common/mail-client";

export class SendgridMailer implements Mailer {
	private client: sgClient.Client;
	private mailClient: sgMail;
	private cfg: SendgridConfig;

	private constructor(cfg: SendgridConfig) {
		this.cfg = cfg;
		this.client = new sgClient.Client();
		this.mailClient = sgMail;
		this.client.setApiKey(cfg.sendgridApiKey);
		sgMail.setApiKey(cfg.sendgridApiKey);
	}

	static from(raw: unknown): SendgridMailer {
		const cfg = RawSendgridConfigSchema.parse(raw);
		return new SendgridMailer(cfg);
	}

	async verify(): Promise<VerifyResult> {
		try {
			await this.mailClient.send(
				{
					to: "probe@example.com",
					from: "probe@example.com",
					subject: "probe",
					text: "probe",
					mailSettings: { sandboxMode: { enable: true } }, // no real send
				},
				false,
			);
			return {
				ok: true,
				message: "OK",
				meta: { provider: "sendgrid", send: true },
			};
		} catch (err: any) {
			return {
				ok: false,
				message: err?.message ?? "SendGrid verify failed",
				meta: { code: err?.code, response: err?.response?.body },
			};
		}
	}

	async sendTestEmail(
		to: string,
		opts?: { subject?: string; body?: string; from?: string },
	): Promise<boolean> {
		try {
			const res = await this.mailClient.send({
				to,
				from: opts?.from ?? "no-reply@kurrier.org",
				subject: opts?.subject ?? "Test email",
				text:
					opts?.body ?? "This is a test email from your configured provider.",
				// If you want a dry run, uncomment sandbox:
				// mailSettings: { sandboxMode: { enable: true } },
			});

			return true;
		} catch (err) {
			console.error("sendTestEmail error", err);
			return false;
		}
	}

	private async upsertInboundParse(
		hostname: string,
		webhookUrl: string,
		opts?: { spamCheck?: boolean },
	) {
		const spamCheck = opts?.spamCheck ?? true;

		const [listRes] = await this.client.request({
			method: "GET",
			url: "/v3/user/webhooks/parse/settings",
		});
		const all: any[] = listRes.body.result ?? [];

		const existing = all.find(
			(s) => s.hostname?.toLowerCase() === hostname.toLowerCase(),
		);

		if (existing) {
			await this.client.request({
				method: "DELETE",
				url: `/v3/user/webhooks/parse/settings/${existing.hostname}`,
			});
		}

		// 3) create fresh
		const [createRes] = await this.client.request({
			method: "POST",
			url: "/v3/user/webhooks/parse/settings",
			body: {
				hostname,
				url: webhookUrl,
				spam_check: spamCheck,
				send_raw: true,
			},
		});

		return createRes.body;
	}

	async addDomain(
		domain: string,
		opts: Record<any, any>,
	): Promise<DomainIdentity> {
		try {
			const [res] = await this.client.request({
				method: "POST",
				url: "/v3/whitelabel/domains",
				body: {
					domain, // e.g. "kurrier.org"
					automatic_security: true,
					custom_spf: false,
					default: true,
				},
			});

			// SendGrid shape
			const body = res.body as {
				id: number;
				user_id: number;
				subdomain: string; // e.g. "em8027"
				domain: string; // e.g. "sendgrid.kurrier.org"
				valid: boolean;
				dns: {
					mail_cname: {
						valid: boolean;
						type: "cname";
						host: string;
						data: string;
					};
					dkim1: { valid: boolean; type: "cname"; host: string; data: string };
					dkim2: { valid: boolean; type: "cname"; host: string; data: string };
				};
				[k: string]: any;
			};

			// Map SendGrid dns -> your DnsRecord[]
			const dns: DnsRecord[] = [
				{
					type: "CNAME",
					name: body.dns.mail_cname.host,
					value: body.dns.mail_cname.data,
					note: "SendGrid mail CNAME",
				},
				{
					type: "CNAME",
					name: body.dns.dkim1.host,
					value: body.dns.dkim1.data,
					note: "SendGrid DKIM key 1",
				},
				{
					type: "CNAME",
					name: body.dns.dkim2.host,
					value: body.dns.dkim2.data,
					note: "SendGrid DKIM key 2",
				},
			];

			const status: IdentityStatus = body.valid ? "verified" : "unverified";

			return {
				domain: body.domain,
				status,
				dns,
				meta: {
					id: body.id,
					user_id: body.user_id,
					subdomain: body.subdomain,
					base_domain_requested: domain,
					default: body.default,
					automatic_security: body.automatic_security,
					sendgrid_raw: body,
				},
			};
		} catch (err: any) {
			return {
				domain,
				status: "failed",
				dns: [],
				meta: { error: err?.response?.body ?? err?.message ?? String(err) },
			};
		}
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
		opts: Record<any, any>,
	): Promise<DomainIdentity> {
		let webHookUrl;
		if (opts) {
			webHookUrl = opts.webHookUrl;
		}
		try {
			const [listRes] = await this.client.request({
				method: "GET",
				url: "/v3/whitelabel/domains",
			});

			const all = (listRes.body as any[]) || [];
			const match = all.find(
				(row) => String(row.domain).toLowerCase() === domain,
			);

			if (!match) {
				return {
					domain: d,
					status: "unverified",
					dns: [],
					meta: { error: "IdentityNotFound" },
				};
			}

			const id = match.id as number;

			const [getRes] = await this.client.request({
				method: "GET",
				url: `/v3/whitelabel/domains/${id}`,
			});

			const details = getRes.body as {
				id: number;
				domain: string;
				subdomain?: string;
				valid?: boolean;
				dns?: {
					mail_cname?: {
						valid?: boolean;
						type?: string;
						host: string;
						data: string;
					};
					dkim1?: {
						valid?: boolean;
						type?: string;
						host: string;
						data: string;
					};
					dkim2?: {
						valid?: boolean;
						type?: string;
						host: string;
						data: string;
					};
				};
				[k: string]: any;
			};

			const [valRes] = await this.client.request({
				method: "POST",
				url: `/v3/whitelabel/domains/${id}/validate`,
			});

			const validation = valRes.body as {
				valid?: boolean;
				validation_results?: Record<
					"mail_cname" | "dkim1" | "dkim2",
					{ valid: boolean; reason?: string }
				>;
				[k: string]: any;
			};

			const dns: DnsRecord[] = [];
			if (details.dns?.mail_cname) {
				dns.push({
					type: "CNAME",
					name: details.dns.mail_cname.host,
					value: details.dns.mail_cname.data,
					note: "SendGrid mail CNAME",
				});
			}
			if (details.dns?.dkim1) {
				dns.push({
					type: "CNAME",
					name: details.dns.dkim1.host,
					value: details.dns.dkim1.data,
					note: "SendGrid DKIM key 1",
				});
			}
			if (details.dns?.dkim2) {
				dns.push({
					type: "CNAME",
					name: details.dns.dkim2.host,
					value: details.dns.dkim2.data,
					note: "SendGrid DKIM key 2",
				});
			}
			const status: IdentityStatus = validation.valid
				? "verified"
				: "unverified";

			if (validation.valid) {
				await this.upsertInboundParse(domain, webHookUrl);
			}

			return {
				domain: details.domain,
				status,
				dns,
				meta: {
					id,
					subdomain: details.subdomain,
					validation,
					sendgrid_raw_domain: details,
				},
			};
		} catch (e: any) {
			return {
				domain: domain,
				status: "failed",
				dns: [],
				meta: {
					error: e?.response?.body ?? e?.message ?? String(e),
				},
			};
		}
	}

	async addEmail() {
		return {} as any;
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
			// Convert Blob attachments -> SendGrid format (Base64 string)
			const attachments = opts.attachments
				? await Promise.all(
						opts.attachments.map(async (a) => {
							const buf = Buffer.from(await a.content.arrayBuffer());
							return {
								content: buf.toString("base64"),
								filename: sanitizeFilename(a.name),
								type: a.contentType || "application/octet-stream",
								disposition: "attachment",
							};
						}),
					)
				: undefined;

			const headers: Record<string, string> = {};
			if (opts.inReplyTo) headers["In-Reply-To"] = opts.inReplyTo;
			if (opts.references?.length)
				headers["References"] = opts.references.join(" ");

			const msg: MailDataRequired = {
				from: opts.from,
				to,
				subject: opts.subject,
				text: opts.text || undefined,
				html: opts.html || undefined,
				headers,
				attachments,
			};

			const [response] = await this.mailClient.send(msg, { sandbox: false });

			// SendGrid exposes message id in response headers
			const messageId =
				response?.headers?.["x-message-id"] ||
				response?.headers?.["X-Message-Id"];

			return {
				success: true,
				MessageId: messageId ? String(messageId) : undefined,
			};
		} catch (err) {
			console.error("sendEmail error", err);
			return { success: false };
		}
	}
}
