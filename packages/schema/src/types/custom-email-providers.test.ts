import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CustomEmailProviderCredentialsSchema,
	materializeCustomEmailProvider,
	parseCustomEmailProviders,
} from "./custom-email-providers";

const sharedProvider = {
	id: "arteva",
	name: "Arteva Mail",
	credentialMode: "shared" as const,
	smtp: {
		host: "smtp.artevatechnologies.ru",
		port: 465,
		secure: true,
		pool: false,
	},
	imap: {
		host: "imap.artevatechnologies.ru",
		port: 993,
		secure: true,
	},
};

describe("parseCustomEmailProviders", () => {
	it("returns an empty list for missing or malformed input", () => {
		assert.deepEqual(parseCustomEmailProviders(undefined), []);
		assert.deepEqual(parseCustomEmailProviders(""), []);
		assert.deepEqual(
			parseCustomEmailProviders("not-json", () => {}),
			[],
		);
	});

	it("parses multiple providers and supports optional IMAP", () => {
		const parsed = parseCustomEmailProviders(
			JSON.stringify([
				sharedProvider,
				{
					id: "relay",
					name: "SMTP Relay",
					credentialMode: "separate",
					smtp: { host: "relay.example.com", port: 587, secure: false },
				},
			]),
		);

		assert.equal(parsed.length, 2);
		assert.equal(parsed[0].smtp.pool, false);
		assert.equal(parsed[1].smtp.pool, undefined);
		assert.equal(parsed[1].imap, undefined);
	});

	it("keeps valid entries while skipping invalid and duplicate entries", () => {
		const warnings: string[] = [];
		const parsed = parseCustomEmailProviders(
			JSON.stringify([
				sharedProvider,
				{
					...sharedProvider,
					id: "bad-port",
					smtp: { ...sharedProvider.smtp, port: 70000 },
				},
				{
					...sharedProvider,
					id: "string-port",
					smtp: { ...sharedProvider.smtp, port: "465" },
				},
				{ ...sharedProvider, name: "Duplicate" },
			]),
			(message) => warnings.push(message),
		);

		assert.deepEqual(
			parsed.map((provider) => provider.id),
			["arteva"],
		);
		assert.equal(warnings.length, 3);
	});

	it("rejects unknown fields such as embedded credentials", () => {
		const parsed = parseCustomEmailProviders(
			JSON.stringify([{ ...sharedProvider, password: "must-not-be-here" }]),
			() => {},
		);

		assert.deepEqual(parsed, []);
	});
});

describe("materializeCustomEmailProvider", () => {
	it("copies shared credentials to SMTP and IMAP", () => {
		const config = materializeCustomEmailProvider(sharedProvider, {
			ulid: "01TEST",
			presetId: "arteva",
			credentialMode: "shared",
			username: "alice@artevatechnologies.ru",
			password: "secret",
		});

		assert.equal(config.SMTP_HOST, "smtp.artevatechnologies.ru");
		assert.equal(config.SMTP_USERNAME, "alice@artevatechnologies.ru");
		assert.equal(config.IMAP_USERNAME, "alice@artevatechnologies.ru");
		assert.equal(config.IMAP_PASSWORD, "secret");
	});

	it("uses separate SMTP and IMAP credentials", () => {
		const provider = { ...sharedProvider, credentialMode: "separate" as const };
		const config = materializeCustomEmailProvider(provider, {
			ulid: "01TEST",
			presetId: "arteva",
			credentialMode: "separate",
			smtpUsername: "alice@artevatechnologies.ru",
			smtpPassword: "smtp-secret",
			imapUsername: "alice-imap",
			imapPassword: "imap-secret",
		});

		assert.equal(config.SMTP_PASSWORD, "smtp-secret");
		assert.equal(config.IMAP_USERNAME, "alice-imap");
		assert.equal(config.IMAP_PASSWORD, "imap-secret");
	});

	it("does not add IMAP fields for SMTP-only providers", () => {
		const provider = { ...sharedProvider, imap: undefined };
		const config = materializeCustomEmailProvider(provider, {
			ulid: "01TEST",
			presetId: "arteva",
			credentialMode: "shared",
			username: "alice@artevatechnologies.ru",
			password: "secret",
		});

		assert.equal(config.IMAP_HOST, undefined);
	});

	it("ignores endpoint fields submitted with user credentials", () => {
		const credentials = CustomEmailProviderCredentialsSchema.parse({
			ulid: "01TEST",
			presetId: "arteva",
			credentialMode: "shared",
			username: "alice@artevatechnologies.ru",
			password: "secret",
			SMTP_HOST: "attacker.example.com",
			SMTP_PORT: "25",
		});
		const config = materializeCustomEmailProvider(sharedProvider, credentials);

		assert.equal(config.SMTP_HOST, "smtp.artevatechnologies.ru");
		assert.equal(config.SMTP_PORT, "465");
	});
});
