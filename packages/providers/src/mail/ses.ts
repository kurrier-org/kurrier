import { createHash } from "node:crypto";
import {
	type DnsRecord,
	type DomainIdentity,
	type EmailIdentity,
	type Mailer,
	RawSesConfigSchema,
	type SesConfig,
	type VerifyResult,
} from "../core";
import {
	CreateReceiptRuleCommand,
	CreateReceiptRuleSetCommand,
	DeleteReceiptRuleCommand,
	DescribeActiveReceiptRuleSetCommand,
	DescribeReceiptRuleCommand,
	DescribeReceiptRuleSetCommand,
	type ReceiptRule,
	SES,
	SESClient,
	SendEmailCommand,
	SetActiveReceiptRuleSetCommand,
	SetReceiptRulePositionCommand,
	UpdateReceiptRuleCommand,
} from "@aws-sdk/client-ses";
import {
	type BucketLocationConstraint,
	CreateBucketCommand,
	type CreateBucketCommandInput,
	GetBucketNotificationConfigurationCommand,
	GetBucketPolicyCommand,
	HeadBucketCommand,
	PutBucketNotificationConfigurationCommand,
	PutBucketPolicyCommand,
	PutPublicAccessBlockCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import {
	CreateTopicCommand,
	GetTopicAttributesCommand,
	ListSubscriptionsByTopicCommand,
	SNSClient,
	SetTopicAttributesCommand,
	SubscribeCommand,
} from "@aws-sdk/client-sns";
import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import {
	type Attachment as SesV2Attachment,
	CreateEmailIdentityCommand,
	DeleteEmailIdentityCommand,
	GetEmailIdentityCommand,
	PutEmailIdentityMailFromAttributesCommand,
	SESv2Client,
	SendEmailCommand as SendEmailCommandV2,
	GetAccountCommand,
} from "@aws-sdk/client-sesv2";
import slugify from "@sindresorhus/slugify";

type WebhookSubscriptionStatus = "not-configured" | "pending" | "confirmed";

type BootResult = {
	bucket: string;
	topicArn: string;
	ruleSetName: string;
	bucketExists: boolean;
	topicExists: boolean;
	ruleCreated: boolean;
	webhookSubscriptionStatus: WebhookSubscriptionStatus;
};

type PolicyStatement = Record<string, unknown>;

function errorCode(error: unknown): string | undefined {
	if (!error || typeof error !== "object") return undefined;

	const value = error as { name?: string; Code?: string };
	return value.name || value.Code;
}

function errorStatus(error: unknown): number | undefined {
	if (!error || typeof error !== "object") return undefined;

	return (error as { $metadata?: { httpStatusCode?: number } }).$metadata
		?.httpStatusCode;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "The AWS request failed.";
}

function getPolicyStatements(document: Record<string, unknown>) {
	const value = document.Statement;

	if (value === undefined) return [] as PolicyStatement[];

	const statements = Array.isArray(value) ? value : [value];

	if (
		statements.some(
			(statement) =>
				!statement || typeof statement !== "object" || Array.isArray(statement),
		)
	) {
		throw new Error("An existing AWS resource policy is invalid.");
	}

	return statements as PolicyStatement[];
}

function isInternalHostname(hostname: string): boolean {
	const host = hostname.toLowerCase();

	if (
		host === "localhost" ||
		host.endsWith(".localhost") ||
		host.endsWith(".local")
	) {
		return true;
	}

	const parts = host.split(".");
	if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
		return false;
	}

	const numbers = parts.map(Number);
	if (numbers.some((part) => part > 255)) return false;

	const [first, second] = numbers;

	return (
		first === 0 ||
		first === 10 ||
		first === 127 ||
		(first === 169 && second === 254) ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 168)
	);
}

export class SesMailer implements Mailer {
	private client: SESClient;
	private v2: SESv2Client;
	private cfg: SesConfig;

	private constructor(cfg: SesConfig) {
		const shared = {
			region: cfg.region,
			credentials: {
				accessKeyId: cfg.accessKeyId,
				secretAccessKey: cfg.secretAccessKey,
			},
		};

		this.cfg = cfg;
		this.client = new SESClient(shared);
		this.v2 = new SESv2Client(shared);
	}

	static from(raw: unknown): SesMailer {
		return new SesMailer(RawSesConfigSchema.parse(raw));
	}

	async verify(
		id: string,
		metaData?: Record<string, any>,
	): Promise<VerifyResult> {
		try {
			const account = await this.v2.send(new GetAccountCommand({}));

			if (account.ProductionAccessEnabled !== true) {
				throw new Error(
					`Amazon SES is in the sandbox in ${this.cfg.region}. Choose a region with production access.`,
				);
			}

			if (account.SendingEnabled !== true) {
				throw new Error(
					`Amazon SES sending is disabled in ${this.cfg.region}.`,
				);
			}

			const resourceIds = await this.bootstrap(id, metaData ?? {});

			const message =
				resourceIds.webhookSubscriptionStatus === "pending"
					? "Amazon SES is connected. The webhook subscription is awaiting confirmation."
					: resourceIds.webhookSubscriptionStatus === "not-configured"
						? "Amazon SES is connected. No inbound webhook URL is configured."
						: "Amazon SES is connected.";

			return {
				ok: true,
				message,
				meta: {
					send: true,
					max24HourSend: account.SendQuota?.Max24HourSend,
					maxSendRate: account.SendQuota?.MaxSendRate,
					sentLast24Hours: account.SendQuota?.SentLast24Hours,
					resourceIds,
				},
			};
		} catch (error) {
			return {
				ok: false,
				message: errorMessage(error),
				meta: {
					code: errorCode(error),
					httpStatus: errorStatus(error),
				},
			};
		}
	}

	private baseNames(id: string) {
		if (
			!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
				id,
			)
		) {
			throw new Error("The SES provider ID is invalid.");
		}

		const base = `kurrier-${id}`;
		const compactId = id.replaceAll("-", "");
		const readableRegionalBucket = `kurrier-${compactId}-${this.cfg.region}-ses-inbound`;
		const regionHash = createHash("sha256")
			.update(this.cfg.region)
			.digest("hex")
			.slice(0, 8);

		return {
			legacyBucket: `${base}-ses-inbound`,
			regionalBucket:
				readableRegionalBucket.length <= 63
					? readableRegionalBucket
					: `kurrier-${compactId}-${regionHash}-ses-inbound`,
			topicName: `${base}-ses-inbound-topic`,
			ruleSetName: `${base}-rules`,
			defaultRuleName: `${base}-inbound-default`,
			s3NotifId: `${base}-s3-objectcreated-inbound`,
		};
	}

	private buildSesHeaders(inReplyTo?: string, references?: string[]) {
		const normalize = (value?: string) => {
			const trimmed = value?.trim();

			if (!trimmed) return "";
			if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
				return trimmed;
			}
			if (trimmed.startsWith("<")) return `${trimmed}>`;

			return `<${trimmed}>`;
		};

		const headers: { Name: string; Value: string }[] = [];
		const replyId = normalize(inReplyTo);

		if (replyId) {
			headers.push({
				Name: "In-Reply-To",
				Value: replyId,
			});
		}

		if (references?.length) {
			const normalized = [
				...new Set(references.map(normalize).filter(Boolean)),
			];
			const selected: string[] = [];
			let length = 0;

			for (let index = normalized.length - 1; index >= 0; index--) {
				const value = normalized[index];
				const addedLength = value.length + (selected.length ? 1 : 0);

				if (length + addedLength > 850) break;

				selected.push(value);
				length += addedLength;
			}

			if (selected.length) {
				headers.push({
					Name: "References",
					Value: selected.reverse().join(" "),
				});
			}
		}

		return headers;
	}

	private async bucketState(s3: S3Client, bucket: string) {
		try {
			await s3.send(new HeadBucketCommand({ Bucket: bucket }));

			return "exists" as const;
		} catch (error) {
			const status = errorStatus(error);

			if (status === 404) return "missing" as const;
			if (status === 301) return "other-region" as const;

			throw error;
		}
	}

	private async ensureBucket(
		s3: S3Client,
		legacyBucket: string,
		regionalBucket: string,
	) {
		const legacyState = await this.bucketState(s3, legacyBucket);

		if (legacyState === "exists") {
			return {
				bucket: legacyBucket,
				existed: true,
			};
		}

		const bucket =
			legacyState === "other-region" ? regionalBucket : legacyBucket;

		if (bucket === regionalBucket) {
			const regionalState = await this.bucketState(s3, regionalBucket);

			if (regionalState === "exists") {
				return {
					bucket: regionalBucket,
					existed: true,
				};
			}

			if (regionalState === "other-region") {
				throw new Error("The SES inbound bucket is in a different AWS region.");
			}
		}

		const input: CreateBucketCommandInput = {
			Bucket: bucket,
		};

		if (this.cfg.region !== "us-east-1") {
			input.CreateBucketConfiguration = {
				LocationConstraint: this.cfg.region as BucketLocationConstraint,
			};
		}

		try {
			await s3.send(new CreateBucketCommand(input));
		} catch (error) {
			if (errorCode(error) !== "BucketAlreadyOwnedByYou") {
				throw error;
			}

			await s3.send(new HeadBucketCommand({ Bucket: bucket }));

			return {
				bucket,
				existed: true,
			};
		}

		return {
			bucket,
			existed: false,
		};
	}

	private async ensureBucketPolicy(
		s3: S3Client,
		bucket: string,
		accountId: string,
	) {
		let document: Record<string, unknown> = {
			Version: "2012-10-17",
			Statement: [],
		};

		try {
			const result = await s3.send(
				new GetBucketPolicyCommand({ Bucket: bucket }),
			);

			if (result.Policy) {
				const parsed: unknown = JSON.parse(result.Policy);

				if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
					throw new Error("The existing S3 bucket policy is invalid.");
				}

				document = parsed as Record<string, unknown>;
			}
		} catch (error) {
			if (errorCode(error) !== "NoSuchBucketPolicy") {
				throw error;
			}
		}

		const sid = "AllowSESPutObject";
		const statement = {
			Sid: sid,
			Effect: "Allow",
			Principal: {
				Service: "ses.amazonaws.com",
			},
			Action: "s3:PutObject",
			Resource: `arn:aws:s3:::${bucket}/*`,
			Condition: {
				StringEquals: {
					"aws:SourceAccount": accountId,
				},
			},
		};

		const existing = getPolicyStatements(document);
		const current = existing.find((item) => item.Sid === sid);

		if (current && JSON.stringify(current) === JSON.stringify(statement)) {
			return;
		}

		document.Statement = [
			...existing.filter((item) => item.Sid !== sid),
			statement,
		];

		await s3.send(
			new PutBucketPolicyCommand({
				Bucket: bucket,
				Policy: JSON.stringify(document),
			}),
		);
	}

	private async ensureTopicPolicy(
		sns: SNSClient,
		topicArn: string,
		bucket: string,
		accountId: string,
	) {
		const result = await sns.send(
			new GetTopicAttributesCommand({
				TopicArn: topicArn,
			}),
		);

		const existingPolicy = result.Attributes?.Policy;
		let document: Record<string, unknown> = {
			Version: "2012-10-17",
			Statement: [],
		};

		if (existingPolicy) {
			const parsed: unknown = JSON.parse(existingPolicy);

			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
				throw new Error("The existing SNS topic policy is invalid.");
			}

			document = parsed as Record<string, unknown>;
		}

		const sid = "AllowS3Publish";
		const statement = {
			Sid: sid,
			Effect: "Allow",
			Principal: {
				Service: "s3.amazonaws.com",
			},
			Action: "sns:Publish",
			Resource: topicArn,
			Condition: {
				StringEquals: {
					"aws:SourceAccount": accountId,
				},
				ArnLike: {
					"aws:SourceArn": `arn:aws:s3:::${bucket}`,
				},
			},
		};

		const existing = getPolicyStatements(document);
		const current = existing.find((item) => item.Sid === sid);

		if (current && JSON.stringify(current) === JSON.stringify(statement)) {
			return;
		}

		document.Statement = [
			...existing.filter((item) => item.Sid !== sid),
			statement,
		];

		await sns.send(
			new SetTopicAttributesCommand({
				TopicArn: topicArn,
				AttributeName: "Policy",
				AttributeValue: JSON.stringify(document),
			}),
		);
	}

	private async ensureBucketNotification(
		s3: S3Client,
		bucket: string,
		topicArn: string,
		notificationId: string,
	) {
		const current = await s3.send(
			new GetBucketNotificationConfigurationCommand({
				Bucket: bucket,
			}),
		);

		const desired = {
			Id: notificationId,
			TopicArn: topicArn,
			Events: ["s3:ObjectCreated:*"] as const,
			Filter: {
				Key: {
					FilterRules: [
						{
							Name: "prefix" as const,
							Value: "inbound/",
						},
					],
				},
			},
		};

		const existing = current.TopicConfigurations?.find(
			(item) => item.Id === notificationId,
		);

		if (
			existing?.TopicArn === desired.TopicArn &&
			existing.Events?.length === 1 &&
			existing.Events[0] === desired.Events[0] &&
			existing.Filter?.Key?.FilterRules?.length === 1 &&
			existing.Filter.Key.FilterRules[0]?.Name === "prefix" &&
			existing.Filter.Key.FilterRules[0]?.Value === "inbound/"
		) {
			return;
		}

		const topics = (current.TopicConfigurations ?? []).filter(
			(item) => item.Id !== notificationId,
		);

		topics.push({
			Id: desired.Id,
			TopicArn: desired.TopicArn,
			Events: ["s3:ObjectCreated:*"],
			Filter: desired.Filter,
		});

		await s3.send(
			new PutBucketNotificationConfigurationCommand({
				Bucket: bucket,
				NotificationConfiguration: {
					TopicConfigurations: topics,
					QueueConfigurations: current.QueueConfigurations,
					LambdaFunctionConfigurations: current.LambdaFunctionConfigurations,
					EventBridgeConfiguration: current.EventBridgeConfiguration,
				},
			}),
		);
	}

	private async ensureRuleSet(ses: SES, desired: string) {
		const active = await ses.send(new DescribeActiveReceiptRuleSetCommand({}));

		if (active.Metadata?.Name) {
			return {
				name: active.Metadata.Name,
				owned: active.Metadata.Name === desired,
			};
		}

		try {
			await ses.send(
				new CreateReceiptRuleSetCommand({
					RuleSetName: desired,
				}),
			);
		} catch (error) {
			if (errorCode(error) !== "RuleSetNameAlreadyExists") {
				throw error;
			}
		}

		await ses.send(
			new SetActiveReceiptRuleSetCommand({
				RuleSetName: desired,
			}),
		);

		return {
			name: desired,
			owned: true,
		};
	}

	private async ensureDefaultRule(
		ses: SES,
		ruleSetName: string,
		ruleName: string,
		bucket: string,
	) {
		const result = await ses.send(
			new DescribeReceiptRuleSetCommand({
				RuleSetName: ruleSetName,
			}),
		);

		const existing = result.Rules?.find((rule) => rule.Name === ruleName);

		if (existing) {
			const correctDestination =
				existing.Actions?.some(
					(action) =>
						action.S3Action?.BucketName === bucket &&
						action.S3Action?.ObjectKeyPrefix === "inbound/",
				) ?? false;

			if (!correctDestination) {
				await ses.send(
					new UpdateReceiptRuleCommand({
						RuleSetName: ruleSetName,
						Rule: {
							Name: ruleName,
							Enabled: true,
							Actions: [
								{
									S3Action: {
										BucketName: bucket,
										ObjectKeyPrefix: "inbound/",
									},
								},
								{
									StopAction: {
										Scope: "RuleSet",
									},
								},
							],
							ScanEnabled: true,
							TlsPolicy: "Optional",
						},
					}),
				);
			}

			return false;
		}

		try {
			await ses.send(
				new CreateReceiptRuleCommand({
					RuleSetName: ruleSetName,
					Rule: {
						Name: ruleName,
						Enabled: true,
						Actions: [
							{
								S3Action: {
									BucketName: bucket,
									ObjectKeyPrefix: "inbound/",
								},
							},
							{
								StopAction: {
									Scope: "RuleSet",
								},
							},
						],
						ScanEnabled: true,
						TlsPolicy: "Optional",
					},
				}),
			);
		} catch (error) {
			if (errorCode(error) !== "RuleAlreadyExists") {
				throw error;
			}

			return false;
		}

		return true;
	}

	async ensureWebhookSubscription(
		sns: SNSClient,
		topicArn: string,
		webhookUrl?: string,
	): Promise<WebhookSubscriptionStatus> {
		if (!webhookUrl) return "not-configured";

		let url: URL;

		try {
			url = new URL(webhookUrl);
		} catch {
			throw new Error("The SES webhook URL is invalid.");
		}

		if (url.protocol !== "http:" && url.protocol !== "https:") {
			throw new Error("The SES webhook URL must use HTTP or HTTPS.");
		}

		if (isInternalHostname(url.hostname)) {
			throw new Error(
				"Amazon SNS cannot reach the local webhook address. Configure the public tunnel URL and verify again.",
			);
		}

		const endpoint = url.toString();
		const protocol = url.protocol === "https:" ? "https" : "http";
		let nextToken: string | undefined;

		do {
			const result = await sns.send(
				new ListSubscriptionsByTopicCommand({
					TopicArn: topicArn,
					NextToken: nextToken,
				}),
			);

			const existing = result.Subscriptions?.find(
				(item) => item.Endpoint === endpoint && item.Protocol === protocol,
			);

			if (existing) {
				return existing.SubscriptionArn &&
					existing.SubscriptionArn !== "PendingConfirmation"
					? "confirmed"
					: "pending";
			}

			nextToken = result.NextToken;
		} while (nextToken);

		try {
			const result = await sns.send(
				new SubscribeCommand({
					TopicArn: topicArn,
					Protocol: protocol,
					Endpoint: endpoint,
					Attributes: {
						RawMessageDelivery: "false",
					},
					ReturnSubscriptionArn: true,
				}),
			);

			return result.SubscriptionArn &&
				result.SubscriptionArn !== "PendingConfirmation"
				? "confirmed"
				: "pending";
		} catch (error) {
			if (
				errorMessage(error).includes(
					"Not authorized to subscribe internal endpoints",
				)
			) {
				throw new Error(
					"Amazon SNS sees the webhook as an internal address. Check that the configured URL is your public tunnel URL.",
				);
			}

			throw error;
		}
	}

	private async bootstrap(
		id: string,
		metaData: Record<string, any>,
	): Promise<BootResult> {
		const { region, accessKeyId, secretAccessKey } = this.cfg;

		const shared = {
			region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		};

		const s3 = new S3Client(shared);
		const sns = new SNSClient(shared);
		const ses = new SES(shared);
		const sts = new STSClient(shared);

		const caller = await sts.send(new GetCallerIdentityCommand({}));
		const accountId = caller.Account;

		if (!accountId) {
			throw new Error("AWS did not return an account ID.");
		}

		const names = this.baseNames(id);
		const { bucket, existed: bucketExists } = await this.ensureBucket(
			s3,
			names.legacyBucket,
			names.regionalBucket,
		);

		await this.ensureBucketPolicy(s3, bucket, accountId);

		await s3.send(
			new PutPublicAccessBlockCommand({
				Bucket: bucket,
				PublicAccessBlockConfiguration: {
					BlockPublicAcls: true,
					IgnorePublicAcls: true,
					BlockPublicPolicy: true,
					RestrictPublicBuckets: true,
				},
			}),
		);

		const topicArn = (
			await sns.send(
				new CreateTopicCommand({
					Name: names.topicName,
				}),
			)
		).TopicArn;

		if (!topicArn) {
			throw new Error("AWS did not return the SNS topic ARN.");
		}

		await this.ensureTopicPolicy(sns, topicArn, bucket, accountId);

		let webhookUrl: string | undefined = metaData.webHookUrl;
		const localTunnelUrl = process.env.LOCAL_TUNNEL_URL?.trim();

		if (localTunnelUrl) {
			const tunnel = new URL(localTunnelUrl);
			const webhookPath = webhookUrl
				? new URL(webhookUrl).pathname + new URL(webhookUrl).search
				: "/api/v1/hooks/aws/ses/inbound";

			webhookUrl = new URL(webhookPath, tunnel.origin).toString();
		}

		const webhookSubscriptionStatus = await this.ensureWebhookSubscription(
			sns,
			topicArn,
			webhookUrl,
		);

		await this.ensureBucketNotification(s3, bucket, topicArn, names.s3NotifId);

		const ruleSet = await this.ensureRuleSet(ses, names.ruleSetName);

		const ruleCreated = ruleSet.owned
			? await this.ensureDefaultRule(
					ses,
					ruleSet.name,
					names.defaultRuleName,
					bucket,
				)
			: false;

		return {
			bucket,
			topicArn,
			ruleSetName: ruleSet.name,
			bucketExists,
			topicExists: true,
			ruleCreated,
			webhookSubscriptionStatus,
		};
	}

	async removeEmail(email: string, opts: Record<any, any>) {
		const ses = new SES({
			region: this.cfg.region,
			credentials: {
				accessKeyId: this.cfg.accessKeyId,
				secretAccessKey: this.cfg.secretAccessKey,
			},
		});

		try {
			await ses.send(
				new DeleteReceiptRuleCommand({
					RuleSetName: opts.ruleSetName,
					RuleName: opts.ruleName,
				}),
			);

			return { removed: true };
		} catch (error) {
			if (errorCode(error) === "RuleDoesNotExist") {
				return { removed: false };
			}

			throw error;
		}
	}

	async addEmail(
		address: string,
		objectKeyPrefix: string,
		metaData?: Record<string, any>,
	): Promise<EmailIdentity> {
		const resources = metaData?.resourceIds as BootResult | undefined;

		if (!resources?.bucket || !resources.ruleSetName) {
			throw new Error(
				"Verify the SES provider before adding an email identity.",
			);
		}

		const normalized = address.trim().toLowerCase();
		const ses = new SES({
			region: this.cfg.region,
			credentials: {
				accessKeyId: this.cfg.accessKeyId,
				secretAccessKey: this.cfg.secretAccessKey,
			},
		});

		const active = await this.ensureRuleSet(ses, resources.ruleSetName);

		const current = await ses.send(
			new DescribeReceiptRuleSetCommand({
				RuleSetName: active.name,
			}),
		);

		const existing = current.Rules?.find((rule) =>
			rule.Recipients?.some(
				(recipient) => recipient.toLowerCase() === normalized,
			),
		);

		if (existing) {
			const correctDestination =
				existing.Actions?.some(
					(action) =>
						action.S3Action?.BucketName === resources.bucket &&
						action.S3Action?.ObjectKeyPrefix === objectKeyPrefix,
				) ?? false;

			if (!correctDestination || !existing.Name) {
				throw new Error(
					"This address already has a different SES receipt rule.",
				);
			}

			await ses.send(
				new SetReceiptRulePositionCommand({
					RuleSetName: active.name,
					RuleName: existing.Name,
				}),
			);

			return {
				address: normalized,
				ruleName: existing.Name,
				ruleSetName: active.name,
				created: false,
				slug: slugify(address),
			};
		}

		const hash = createHash("sha256")
			.update(`${resources.bucket}:${normalized}`)
			.digest("hex")
			.slice(0, 16);
		const prefix = slugify(normalized, {
			customReplacements: [["@", " at "]],
		});
		const ruleName = `${prefix.slice(0, 40)}-${hash}`;

		const rule: ReceiptRule = {
			Name: ruleName,
			Enabled: true,
			Recipients: [normalized],
			Actions: [
				{
					S3Action: {
						BucketName: resources.bucket,
						ObjectKeyPrefix: objectKeyPrefix,
					},
				},
				{
					StopAction: {
						Scope: "RuleSet",
					},
				},
			],
			ScanEnabled: true,
			TlsPolicy: "Optional",
		};

		let created = true;

		try {
			await ses.send(
				new CreateReceiptRuleCommand({
					RuleSetName: active.name,
					Rule: rule,
				}),
			);
		} catch (error) {
			if (errorCode(error) !== "RuleAlreadyExists") {
				throw error;
			}

			const result = await ses.send(
				new DescribeReceiptRuleCommand({
					RuleSetName: active.name,
					RuleName: ruleName,
				}),
			);

			const matches =
				result.Rule?.Recipients?.length === 1 &&
				result.Rule.Recipients[0].toLowerCase() === normalized &&
				result.Rule.Actions?.some(
					(action) =>
						action.S3Action?.BucketName === resources.bucket &&
						action.S3Action?.ObjectKeyPrefix === objectKeyPrefix,
				);

			if (!matches) {
				throw new Error("An SES receipt rule with this name already exists.");
			}

			created = false;
		}

		await ses.send(
			new SetReceiptRulePositionCommand({
				RuleSetName: active.name,
				RuleName: ruleName,
			}),
		);

		return {
			address: normalized,
			ruleName,
			ruleSetName: active.name,
			created,
			slug: slugify(address),
		};
	}

	async addDomain(
		domain: string,
		opts: Record<any, any>,
	): Promise<DomainIdentity> {
		const { mailFrom, incoming } = opts;

		try {
			await this.v2.send(
				new CreateEmailIdentityCommand({
					EmailIdentity: domain,
					DkimSigningAttributes: {
						NextSigningKeyLength: "RSA_2048_BIT",
					},
				}),
			);
		} catch (error) {
			if (
				errorCode(error) !== "ConflictException" &&
				errorCode(error) !== "AlreadyExistsException"
			) {
				return {
					domain,
					status: "unverified" as any,
					dns: [],
					meta: {
						error: errorCode(error) ?? "CreateEmailIdentityError",
						message: errorMessage(error),
					},
				};
			}
		}

		const info = await this.v2.send(
			new GetEmailIdentityCommand({
				EmailIdentity: domain,
			}),
		);

		const dkimRecords: DnsRecord[] = (info.DkimAttributes?.Tokens ?? []).map(
			(token) => ({
				type: "CNAME",
				name: `${token}._domainkey.${domain}`,
				value: `${token}.dkim.amazonses.com`,
			}),
		);

		const sesStatus = info.VerificationStatus || "PENDING";
		const status =
			sesStatus === "SUCCESS"
				? ("verified" as any)
				: sesStatus === "PENDING"
					? ("pending" as any)
					: sesStatus === "FAILED"
						? ("failed" as any)
						: ("unverified" as any);

		let extraDns: DnsRecord[] = [];
		let extraMeta: Record<string, any> = {};

		if (mailFrom) {
			const configured = await this.configureMailFrom(domain, mailFrom);
			extraDns = configured.dns;
			extraMeta = configured.meta;
		}

		const incomingDns: DnsRecord[] = incoming
			? [
					{
						type: "MX",
						name: domain,
						value: `10 inbound-smtp.${this.cfg.region}.amazonaws.com`,
						note: "Route incoming email via SES inbound",
					},
				]
			: [];

		return {
			domain,
			status,
			dns: [...dkimRecords, ...extraDns, ...incomingDns],
			meta: {
				sesStatus,
				signingAttributesOrigin: info.DkimAttributes?.SigningAttributesOrigin,
				...(mailFrom ? { mailFrom: extraMeta } : {}),
			},
		};
	}

	private async configureMailFrom(
		domain: string,
		mailFrom: string,
	): Promise<{
		dns: DnsRecord[];
		meta: Record<string, any>;
	}> {
		const normalized = mailFrom.trim().replace(/\.$/, "");

		if (!normalized.endsWith(`.${domain}`)) {
			throw new Error(`MAIL FROM must be a subdomain of ${domain}`);
		}

		await this.v2.send(
			new PutEmailIdentityMailFromAttributesCommand({
				EmailIdentity: domain,
				MailFromDomain: normalized,
			}),
		);

		const info = await this.v2.send(
			new GetEmailIdentityCommand({
				EmailIdentity: domain,
			}),
		);

		const dns: DnsRecord[] = [
			{
				type: "MX",
				name: normalized,
				value: `10 feedback-smtp.${this.cfg.region}.amazonses.com`,
				priority: 10,
				note: "Custom MAIL FROM (SPF alignment)",
			},
			{
				type: "TXT",
				name: normalized,
				value: "v=spf1 include:amazonses.com -all",
				note: "Custom MAIL FROM (SPF alignment)",
			},
			{
				type: "TXT",
				name: `_dmarc.${domain}`,
				value: "v=DMARC1; p=none;",
				note: "Recommended DMARC policy",
			},
		];

		return {
			dns,
			meta: {
				mailFromDomain: info.MailFromAttributes?.MailFromDomain,
				mailFromDomainStatus: info.MailFromAttributes?.MailFromDomainStatus,
				behaviorOnMxFailure: info.MailFromAttributes?.BehaviorOnMxFailure,
			},
		};
	}

	private normalizeDomain(domain: string) {
		return domain.trim().replace(/\.$/, "").toLowerCase();
	}

	async removeDomain(domain: string): Promise<DomainIdentity> {
		const normalized = this.normalizeDomain(domain);

		try {
			await this.v2.send(
				new DeleteEmailIdentityCommand({
					EmailIdentity: normalized,
				}),
			);
		} catch (error) {
			if (
				errorCode(error) !== "NotFoundException" &&
				errorStatus(error) !== 404
			) {
				throw error;
			}
		}

		return {
			domain: normalized,
			status: "unverified" as any,
			dns: [],
			meta: { deleted: true },
		};
	}

	async verifyDomain(domain: string): Promise<DomainIdentity> {
		const normalized = this.normalizeDomain(domain);

		try {
			const info = await this.v2.send(
				new GetEmailIdentityCommand({
					EmailIdentity: normalized,
				}),
			);

			const dkimRecords: DnsRecord[] = (info.DkimAttributes?.Tokens ?? []).map(
				(token) => ({
					type: "CNAME",
					name: `${token}._domainkey.${normalized}`,
					value: `${token}.dkim.amazonses.com`,
				}),
			);

			const mailFrom = info.MailFromAttributes?.MailFromDomain?.trim().replace(
				/\.$/,
				"",
			);

			const mailFromDns: DnsRecord[] = mailFrom
				? [
						{
							type: "MX",
							name: mailFrom,
							value: `10 feedback-smtp.${this.cfg.region}.amazonses.com`,
							priority: 10,
							note: "Custom MAIL FROM (SPF alignment)",
						},
						{
							type: "TXT",
							name: mailFrom,
							value: "v=spf1 include:amazonses.com -all",
							note: "Custom MAIL FROM (SPF alignment)",
						},
					]
				: [];

			const sesStatus = info.VerificationStatus || "PENDING";
			const status =
				sesStatus === "SUCCESS"
					? ("verified" as any)
					: sesStatus === "PENDING"
						? ("pending" as any)
						: sesStatus === "FAILED"
							? ("failed" as any)
							: ("unverified" as any);

			return {
				domain: normalized,
				status,
				dns: [...dkimRecords, ...mailFromDns],
				meta: {
					sesStatus,
					signingAttributesOrigin: info.DkimAttributes?.SigningAttributesOrigin,
					mailFrom: mailFrom
						? {
								mailFromDomain: mailFrom,
								mailFromDomainStatus:
									info.MailFromAttributes?.MailFromDomainStatus,
								behaviorOnMxFailure:
									info.MailFromAttributes?.BehaviorOnMxFailure,
							}
						: undefined,
					verificationInfo: info.VerificationInfo,
				},
			};
		} catch (error) {
			return {
				domain: normalized,
				status: "unverified" as any,
				dns: [],
				meta: {
					error:
						errorCode(error) === "NotFoundException" ||
						errorStatus(error) === 404
							? "IdentityNotFound"
							: errorCode(error),
					message: errorMessage(error),
				},
			};
		}
	}

	async getSendingQuota() {
		const [account, caller] = await Promise.all([
			this.v2.send(new GetAccountCommand({})),
			new STSClient({
				region: this.cfg.region,
				credentials: {
					accessKeyId: this.cfg.accessKeyId,
					secretAccessKey: this.cfg.secretAccessKey,
				},
			}).send(new GetCallerIdentityCommand({})),
		]);

		const quota = account.SendQuota;

		if (
			!caller.Account ||
			quota?.MaxSendRate === undefined ||
			quota.Max24HourSend === undefined ||
			quota.SentLast24Hours === undefined
		) {
			throw new Error("AWS did not return complete SES sending limits.");
		}

		return {
			accountId: caller.Account,
			region: this.cfg.region,
			sendingEnabled: account.SendingEnabled === true,
			productionAccessEnabled: account.ProductionAccessEnabled === true,
			maxPerSecond: quota.MaxSendRate,
			maxPer24Hours: quota.Max24HourSend < 0 ? null : quota.Max24HourSend,
			sentLast24Hours: quota.SentLast24Hours,
		};
	}

	async sendTestEmail(
		to: string,
		opts?: {
			subject?: string;
			body?: string;
		},
	): Promise<boolean> {
		const subject = opts?.subject ?? "Test email";
		const body =
			opts?.body ?? "This is a test email from your configured SES account.";
		const from = "no-reply@kurrier.org";

		try {
			await this.client.send(
				new SendEmailCommand({
					Source: from,
					Destination: {
						ToAddresses: [to],
					},
					Message: {
						Subject: {
							Data: subject,
							Charset: "UTF-8",
						},
						Body: {
							Text: {
								Data: body,
								Charset: "UTF-8",
							},
						},
					},
				}),
			);

			return true;
		} catch (error) {
			console.error("SES sendTestEmail error:", error);
			return false;
		}
	}

	async sendEmail(
		to: string[],
		opts: {
			cc?: string[];
			bcc?: string[];
			subject: string;
			text: string;
			html: string;
			from: string;
			inReplyTo: string;
			references: string[];
			headers?: Record<string, string>;
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
		const attachments: SesV2Attachment[] = await Promise.all(
			(opts.attachments ?? []).map(async (attachment) => ({
				FileName: attachment.name,
				RawContent: new Uint8Array(await attachment.content.arrayBuffer()),
				ContentType:
					attachment.contentType ||
					attachment.content.type ||
					"application/octet-stream",
				ContentTransferEncoding: "BASE64",
			})),
		);

		try {
			const { MessageId } = await this.v2.send(
				new SendEmailCommandV2({
					FromEmailAddress: opts.from,
					Destination: {
						ToAddresses: to,
						CcAddresses: opts.cc?.length ? opts.cc : undefined,
						BccAddresses: opts.bcc?.length ? opts.bcc : undefined,
					},
					Content: {
						Simple: {
							Subject: {
								Data: opts.subject,
								Charset: "UTF-8",
							},
							Body: {
								Text: {
									Data: opts.text,
									Charset: "UTF-8",
								},
								Html: {
									Data: opts.html,
									Charset: "UTF-8",
								},
							},
							...(attachments.length
								? {
										Attachments: attachments,
									}
								: {}),
							Headers: [
								...this.buildSesHeaders(opts.inReplyTo, opts.references),
								...Object.entries(opts.headers ?? {}).map(([Name, Value]) => ({
									Name,
									Value,
								})),
							],
						},
					},
				}),
			);

			return {
				MessageId: MessageId
					? `<${MessageId}@${this.cfg.region}.amazonses.com>`
					: undefined,
				success: true,
			};
		} catch (error) {
			console.error("SES sendEmail error:", error);

			return {
				success: false,
				error: errorCode(error) ?? "SesSendFailed",
			};
		}
	}
}
