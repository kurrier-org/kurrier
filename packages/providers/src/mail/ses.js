"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SesMailer = void 0;
var core_1 = require("../core");
var client_ses_1 = require("@aws-sdk/client-ses");
var client_s3_1 = require("@aws-sdk/client-s3");
var client_sns_1 = require("@aws-sdk/client-sns");
var client_ses_2 = require("@aws-sdk/client-ses");
var client_sts_1 = require("@aws-sdk/client-sts");
var client_sesv2_1 = require("@aws-sdk/client-sesv2");
var slugify_1 = __importDefault(require("@sindresorhus/slugify"));
var ulid_1 = require("ulid");
// import {kvGet} from "@common";
var SesMailer = /** @class */ (function () {
    function SesMailer(cfg) {
        var shared = {
            region: cfg.region,
            credentials: {
                accessKeyId: cfg.accessKeyId,
                secretAccessKey: cfg.secretAccessKey,
            },
        };
        this.cfg = cfg;
        this.client = new client_ses_1.SESClient(shared);
        this.v2 = new client_sesv2_1.SESv2Client(shared);
    }
    SesMailer.from = function (raw) {
        var cfg = core_1.RawSesConfigSchema.parse(raw);
        return new SesMailer(cfg);
    };
    SesMailer.prototype.verify = function (id, metaData) {
        return __awaiter(this, void 0, void 0, function () {
            var q, bootResult, err_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.client.send(new client_ses_1.GetSendQuotaCommand({}))];
                    case 1:
                        q = _c.sent();
                        return [4 /*yield*/, this.bootstrap(id, metaData || {})];
                    case 2:
                        bootResult = _c.sent();
                        return [2 /*return*/, {
                                ok: true,
                                message: "OK",
                                meta: {
                                    send: true,
                                    // handy diagnostics:
                                    max24HourSend: q.Max24HourSend,
                                    maxSendRate: q.MaxSendRate,
                                    sentLast24Hours: q.SentLast24Hours,
                                    resourceIds: bootResult,
                                },
                            }];
                    case 3:
                        err_1 = _c.sent();
                        return [2 /*return*/, {
                                ok: false,
                                message: (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) !== null && _a !== void 0 ? _a : "SES verify failed",
                                meta: {
                                    code: err_1 === null || err_1 === void 0 ? void 0 : err_1.name,
                                    httpStatus: (_b = err_1 === null || err_1 === void 0 ? void 0 : err_1.$metadata) === null || _b === void 0 ? void 0 : _b.httpStatusCode,
                                },
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SesMailer.prototype.baseNames = function (id) {
        var base = "kurrier-".concat(id !== null && id !== void 0 ? id : "acct");
        return {
            bucket: "".concat(base, "-ses-inbound"),
            topicName: "".concat(base, "-ses-inbound-topic"),
            ruleSetName: "".concat(base, "-rules"),
            defaultRuleName: "".concat(base, "-inbound-default"),
            s3NotifId: "".concat(base, "-s3-objectcreated-inbound"),
        };
    };
    SesMailer.prototype.buildSesHeaders = function (inReplyTo, references) {
        var MAX_REF_VALUE_LEN = 850; // SES limit is 870, keep headroom
        var normalize = function (id) {
            if (!id)
                return "";
            var s = String(id).trim();
            if (!s)
                return "";
            return s.startsWith("<") && s.endsWith(">")
                ? s
                : s.startsWith("<")
                    ? s + ">"
                    : "<".concat(s, ">");
        };
        var headers = [];
        if (inReplyTo) {
            var val = normalize(inReplyTo);
            if (val)
                headers.push({ Name: "In-Reply-To", Value: val });
        }
        if (references && references.length > 0) {
            var seen = new Set();
            var normalized = [];
            for (var _i = 0, references_1 = references; _i < references_1.length; _i++) {
                var r = references_1[_i];
                var id = normalize(r);
                if (id && !seen.has(id)) {
                    seen.add(id);
                    normalized.push(id);
                }
            }
            // Add from newest back until we hit budget
            var out = [];
            var total = 0;
            for (var i = normalized.length - 1; i >= 0; i--) {
                var id = normalized[i];
                var extra = (out.length ? 1 : 0) + id.length;
                if (total + extra > MAX_REF_VALUE_LEN)
                    break;
                out.push(id);
                total += extra;
            }
            if (out.length) {
                headers.push({ Name: "References", Value: out.reverse().join(" ") });
            }
        }
        return headers;
    };
    SesMailer.prototype.ensureRuleSet = function (ses, desired) {
        return __awaiter(this, void 0, void 0, function () {
            var active, sets, exists, e_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, ses.send(new client_ses_1.DescribeActiveReceiptRuleSetCommand({}))];
                    case 1:
                        active = _c.sent();
                        if ((_a = active.Metadata) === null || _a === void 0 ? void 0 : _a.Name)
                            return [2 /*return*/, { name: active.Metadata.Name, usedExistingActive: true }];
                        return [4 /*yield*/, ses.send(new client_ses_1.ListReceiptRuleSetsCommand({}))];
                    case 2:
                        sets = _c.sent();
                        exists = (_b = sets.RuleSets) === null || _b === void 0 ? void 0 : _b.some(function (r) { return r.Name === desired; });
                        if (!!exists) return [3 /*break*/, 6];
                        _c.label = 3;
                    case 3:
                        _c.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, ses.send(new client_ses_1.CreateReceiptRuleSetCommand({ RuleSetName: desired }))];
                    case 4:
                        _c.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        e_1 = _c.sent();
                        if ((e_1.name || e_1.Code) !== "RuleSetNameAlreadyExists")
                            throw e_1;
                        return [3 /*break*/, 6];
                    case 6: return [4 /*yield*/, ses.send(new client_ses_1.SetActiveReceiptRuleSetCommand({ RuleSetName: desired }))];
                    case 7:
                        _c.sent();
                        return [2 /*return*/, { name: desired, usedExistingActive: false }];
                }
            });
        });
    };
    SesMailer.prototype.removeEmail = function (email, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var ses, e_2, code;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ses = new client_ses_2.SES({ region: this.cfg.region, credentials: this.cfg });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, ses.send(new client_ses_1.DeleteReceiptRuleCommand({
                                RuleSetName: opts.ruleSetName,
                                RuleName: opts.ruleName,
                            }))];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { removed: true }];
                    case 3:
                        e_2 = _a.sent();
                        code = (e_2 === null || e_2 === void 0 ? void 0 : e_2.name) || (e_2 === null || e_2 === void 0 ? void 0 : e_2.Code);
                        if (code === "RuleDoesNotExist")
                            return [2 /*return*/, { removed: false }];
                        throw e_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SesMailer.prototype.addEmail = function (address, objectKeyPrefix, metaData) {
        return __awaiter(this, void 0, void 0, function () {
            var ses, res, normalized, bucket, topicArn, ruleSetName, activeRuleSet, ruleName, ruleDef, created, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ses = new client_ses_2.SES({ region: this.cfg.region, credentials: this.cfg });
                        res = metaData === null || metaData === void 0 ? void 0 : metaData.resourceIds;
                        if (!(res === null || res === void 0 ? void 0 : res.bucket) || !(res === null || res === void 0 ? void 0 : res.topicArn) || !(res === null || res === void 0 ? void 0 : res.ruleSetName)) {
                            throw new Error("Missing SES bootstrap resource IDs (bucket/topicArn/ruleSetName).");
                        }
                        normalized = address.trim().toLowerCase();
                        bucket = res.bucket, topicArn = res.topicArn, ruleSetName = res.ruleSetName;
                        return [4 /*yield*/, this.ensureRuleSet(ses, ruleSetName)];
                    case 1:
                        activeRuleSet = (_a.sent()).name;
                        ruleName = ((0, slugify_1.default)("".concat(normalized), {
                            customReplacements: [["@", " at "]],
                        }) + "-".concat((0, ulid_1.ulid)())).slice(0, 64);
                        ruleDef = {
                            Name: ruleName,
                            Enabled: true,
                            Recipients: [normalized],
                            Actions: [
                                { S3Action: { BucketName: bucket, ObjectKeyPrefix: objectKeyPrefix } },
                                // { S3Action: { BucketName: bucket, ObjectKeyPrefix: `inbound/${slugify(address)}` } },
                                // {
                                // 	S3Action: {
                                // 		BucketName: bucket,
                                // 		ObjectKeyPrefix: `inbound/${address}`,
                                // 	},
                                // },
                                // { SNSAction: { TopicArn: topicArn, Encoding: "UTF-8" } },
                                { StopAction: { Scope: "RuleSet" } },
                            ],
                            ScanEnabled: true,
                            TlsPolicy: "Optional",
                        };
                        created = false;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 8]);
                        return [4 /*yield*/, ses.send(new client_ses_2.CreateReceiptRuleCommand({
                                RuleSetName: activeRuleSet,
                                Rule: ruleDef,
                            }))];
                    case 3:
                        _a.sent();
                        created = true;
                        return [3 /*break*/, 8];
                    case 4:
                        e_3 = _a.sent();
                        if (!(((e_3 === null || e_3 === void 0 ? void 0 : e_3.name) || (e_3 === null || e_3 === void 0 ? void 0 : e_3.Code)) === "RuleAlreadyExists")) return [3 /*break*/, 6];
                        return [4 /*yield*/, ses.send(new client_ses_1.UpdateReceiptRuleCommand({
                                RuleSetName: activeRuleSet,
                                Rule: ruleDef,
                            }))];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6: throw e_3;
                    case 7: return [3 /*break*/, 8];
                    case 8: return [4 /*yield*/, ses.send(new client_ses_1.SetReceiptRulePositionCommand({
                            RuleSetName: activeRuleSet,
                            RuleName: ruleName,
                            // After: ""
                        }))];
                    case 9:
                        _a.sent();
                        return [2 /*return*/, {
                                address: normalized,
                                ruleName: ruleName,
                                ruleSetName: ruleSetName,
                                created: created,
                                slug: (0, slugify_1.default)(address),
                            }];
                }
            });
        });
    };
    SesMailer.prototype.ensureWebhookSubscription = function (sns, topicArn, webhookUrl) {
        return __awaiter(this, void 0, void 0, function () {
            var existing, same;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!webhookUrl)
                            return [2 /*return*/, { subscribed: false }];
                        return [4 /*yield*/, sns.send(new client_sns_1.ListSubscriptionsByTopicCommand({ TopicArn: topicArn }))];
                    case 1:
                        existing = _b.sent();
                        same = (_a = existing.Subscriptions) === null || _a === void 0 ? void 0 : _a.find(function (s) { var _a; return s.Endpoint === webhookUrl && ((_a = s.Protocol) === null || _a === void 0 ? void 0 : _a.startsWith("http")); });
                        if (!!same) return [3 /*break*/, 3];
                        return [4 /*yield*/, sns.send(new client_sns_1.SubscribeCommand({
                                TopicArn: topicArn,
                                Protocol: webhookUrl.startsWith("https") ? "https" : "http",
                                Endpoint: webhookUrl,
                                Attributes: {
                                    RawMessageDelivery: "false", // get raw JSON
                                    // Optional filter policy to only receive SES inbound notifications you emit
                                    // FilterPolicy: JSON.stringify({ source: ["ses"] })
                                },
                                ReturnSubscriptionArn: true, // will be "pending confirmation" for http(s)
                            }))];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [2 /*return*/, { subscribed: true }];
                }
            });
        });
    };
    SesMailer.prototype.bootstrap = function (id, metaData) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, region, accessKeyId, secretAccessKey, creds, s3, sns, ses, sts, _b, accountId, _c, bucket, topicName, ruleSetName, defaultRuleName, s3NotifId, bucketExists, _d, input, e_4, code, bucketPolicy, topicArn, topicExists, _e, topicPolicy, subscribed, _f, ruleSetNameInUse, usedExistingActive, ruleCreated, current, hasRule;
            var _g;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        _a = this.cfg, region = _a.region, accessKeyId = _a.accessKeyId, secretAccessKey = _a.secretAccessKey;
                        creds = { region: region, credentials: { accessKeyId: accessKeyId, secretAccessKey: secretAccessKey } };
                        s3 = new client_s3_1.S3Client(creds);
                        sns = new client_sns_1.SNSClient(creds);
                        ses = new client_ses_2.SES(creds);
                        sts = new client_sts_1.STSClient(creds);
                        return [4 /*yield*/, sts.send(new client_sts_1.GetCallerIdentityCommand({}))];
                    case 1:
                        _b = (_h.sent()).Account, accountId = _b === void 0 ? "" : _b;
                        _c = this.baseNames(id), bucket = _c.bucket, topicName = _c.topicName, ruleSetName = _c.ruleSetName, defaultRuleName = _c.defaultRuleName, s3NotifId = _c.s3NotifId;
                        bucketExists = false;
                        _h.label = 2;
                    case 2:
                        _h.trys.push([2, 4, , 9]);
                        return [4 /*yield*/, s3.send(new client_s3_1.HeadBucketCommand({ Bucket: bucket }))];
                    case 3:
                        _h.sent();
                        bucketExists = true;
                        return [3 /*break*/, 9];
                    case 4:
                        _d = _h.sent();
                        input = { Bucket: bucket };
                        if (region !== "us-east-1") {
                            input.CreateBucketConfiguration = {
                                LocationConstraint: region,
                            };
                        }
                        _h.label = 5;
                    case 5:
                        _h.trys.push([5, 7, , 8]);
                        return [4 /*yield*/, s3.send(new client_s3_1.CreateBucketCommand(input))];
                    case 6:
                        _h.sent();
                        bucketExists = true;
                        return [3 /*break*/, 8];
                    case 7:
                        e_4 = _h.sent();
                        code = (e_4 === null || e_4 === void 0 ? void 0 : e_4.name) || (e_4 === null || e_4 === void 0 ? void 0 : e_4.Code);
                        if (code !== "BucketAlreadyOwnedByYou")
                            throw e_4;
                        bucketExists = true;
                        return [3 /*break*/, 8];
                    case 8: return [3 /*break*/, 9];
                    case 9:
                        bucketPolicy = {
                            Version: "2012-10-17",
                            Statement: [
                                {
                                    Sid: "AllowSESPutObject",
                                    Effect: "Allow",
                                    Principal: { Service: "ses.amazonaws.com" },
                                    Action: "s3:PutObject",
                                    Resource: "arn:aws:s3:::".concat(bucket, "/*"),
                                    Condition: {
                                        StringEquals: { "aws:SourceAccount": accountId },
                                        // ArnLike: { "aws:SourceArn": `arn:aws:ses:${region}:${accountId}:receipt-rule-set/${ruleSetName}` }
                                    },
                                },
                            ],
                        };
                        return [4 /*yield*/, s3.send(new client_s3_1.PutBucketPolicyCommand({
                                Bucket: bucket,
                                Policy: JSON.stringify(bucketPolicy),
                            }))];
                    case 10:
                        _h.sent();
                        return [4 /*yield*/, s3.send(new client_s3_1.PutPublicAccessBlockCommand({
                                Bucket: bucket,
                                PublicAccessBlockConfiguration: {
                                    BlockPublicAcls: true,
                                    IgnorePublicAcls: true,
                                    BlockPublicPolicy: true,
                                    RestrictPublicBuckets: true,
                                },
                            }))];
                    case 11:
                        _h.sent();
                        return [4 /*yield*/, sns.send(new client_sns_1.CreateTopicCommand({ Name: topicName }))];
                    case 12:
                        topicArn = (_h.sent()).TopicArn;
                        topicExists = false;
                        _h.label = 13;
                    case 13:
                        _h.trys.push([13, 15, , 16]);
                        return [4 /*yield*/, sns.send(new client_sns_1.GetTopicAttributesCommand({ TopicArn: topicArn }))];
                    case 14:
                        _h.sent();
                        topicExists = true;
                        return [3 /*break*/, 16];
                    case 15:
                        _e = _h.sent();
                        topicExists = false;
                        return [3 /*break*/, 16];
                    case 16:
                        topicPolicy = {
                            Version: "2012-10-17",
                            Statement: [
                                // {
                                // 	Sid: "AllowSESPublish",
                                // 	Effect: "Allow",
                                // 	Principal: { Service: "ses.amazonaws.com" },
                                // 	Action: "sns:Publish",
                                // 	Resource: topicArn,
                                // 	Condition: { StringEquals: { "aws:SourceAccount": accountId } },
                                // 	// ArnLike: { "aws:SourceArn": `arn:aws:ses:${region}:${accountId}:receipt-rule-set/${ruleSetName}` }
                                // },
                                {
                                    Sid: "AllowS3Publish",
                                    Effect: "Allow",
                                    Principal: { Service: "s3.amazonaws.com" },
                                    Action: "sns:Publish",
                                    Resource: topicArn,
                                    Condition: {
                                        StringEquals: { "aws:SourceAccount": accountId },
                                        ArnLike: { "aws:SourceArn": "arn:aws:s3:::".concat(bucket) },
                                    },
                                },
                            ],
                        };
                        return [4 /*yield*/, sns.send(new client_sns_1.SetTopicAttributesCommand({
                                TopicArn: topicArn,
                                AttributeName: "Policy",
                                AttributeValue: JSON.stringify(topicPolicy),
                            }))];
                    case 17:
                        _h.sent();
                        return [4 /*yield*/, this.ensureWebhookSubscription(sns, topicArn, 
                            // `${localTunnelUrl ? localTunnelUrl : metaData.WEB_URL}/api/v1/hooks/aws/ses/inbound`,
                            metaData.webHookUrl)];
                    case 18:
                        subscribed = (_h.sent()).subscribed;
                        console.log("subscribed", subscribed);
                        return [4 /*yield*/, s3.send(new client_s3_1.PutBucketNotificationConfigurationCommand({
                                Bucket: bucket,
                                NotificationConfiguration: {
                                    TopicConfigurations: [
                                        {
                                            Id: s3NotifId,
                                            TopicArn: topicArn,
                                            Events: ["s3:ObjectCreated:*"],
                                            Filter: {
                                                Key: {
                                                    FilterRules: [{ Name: "prefix", Value: "inbound/" }],
                                                },
                                            },
                                        },
                                    ],
                                    // Omitting QueueConfigurations and LambdaFunctionConfigurations clears them.
                                },
                            }))];
                    case 19:
                        _h.sent();
                        return [4 /*yield*/, this.ensureRuleSet(ses, ruleSetName)];
                    case 20:
                        _f = _h.sent(), ruleSetNameInUse = _f.name, usedExistingActive = _f.usedExistingActive;
                        ruleCreated = false;
                        if (!!usedExistingActive) return [3 /*break*/, 23];
                        return [4 /*yield*/, ses.send(new client_ses_2.DescribeReceiptRuleSetCommand({ RuleSetName: ruleSetNameInUse }))];
                    case 21:
                        current = _h.sent();
                        hasRule = (_g = current.Rules) === null || _g === void 0 ? void 0 : _g.some(function (r) { return r.Name === defaultRuleName; });
                        if (!!hasRule) return [3 /*break*/, 23];
                        return [4 /*yield*/, ses.send(new client_ses_2.CreateReceiptRuleCommand({
                                RuleSetName: ruleSetNameInUse,
                                Rule: {
                                    Name: defaultRuleName,
                                    Enabled: true,
                                    // Recipients: [] // empty = catch-all
                                    Actions: [
                                        {
                                            S3Action: { BucketName: bucket, ObjectKeyPrefix: "inbound/" },
                                        },
                                        // { SNSAction: { TopicArn: topicArn, Encoding: "UTF-8" } },
                                        { StopAction: { Scope: "RuleSet" } },
                                    ],
                                    ScanEnabled: true,
                                    TlsPolicy: "Optional",
                                },
                            }))];
                    case 22:
                        _h.sent();
                        ruleCreated = true;
                        _h.label = 23;
                    case 23: return [2 /*return*/, {
                            bucket: bucket,
                            topicArn: topicArn,
                            ruleSetName: ruleSetNameInUse,
                            bucketExists: bucketExists,
                            topicExists: topicExists,
                            ruleCreated: ruleCreated,
                        }];
                }
            });
        });
    };
    SesMailer.prototype.addDomain = function (domain, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var mailFrom, incoming, err_2, info, tokens, dkimRecords, sesStatus, status, extraDns, extraMeta, _a, dns, meta, incomingDns;
            var _b, _c, _d, _e;
            return __generator(this, function (_f) {
                switch (_f.label) {
                    case 0:
                        mailFrom = opts.mailFrom, incoming = opts.incoming;
                        _f.label = 1;
                    case 1:
                        _f.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.v2.send(new client_sesv2_1.CreateEmailIdentityCommand({
                                EmailIdentity: domain,
                                DkimSigningAttributes: {
                                    // Easy DKIM
                                    NextSigningKeyLength: "RSA_2048_BIT",
                                },
                            }))];
                    case 2:
                        _f.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        err_2 = _f.sent();
                        // If it already exists, we’ll just proceed to fetch tokens
                        if ((err_2 === null || err_2 === void 0 ? void 0 : err_2.name) !== "ConflictException" &&
                            (err_2 === null || err_2 === void 0 ? void 0 : err_2.name) !== "AlreadyExistsException") {
                            // Return a minimal object but still surface the error in meta
                            return [2 /*return*/, {
                                    domain: domain,
                                    status: "unverified",
                                    dns: [],
                                    meta: {
                                        error: (_b = err_2 === null || err_2 === void 0 ? void 0 : err_2.name) !== null && _b !== void 0 ? _b : "CreateEmailIdentityError",
                                        message: err_2 === null || err_2 === void 0 ? void 0 : err_2.message,
                                    },
                                }];
                        }
                        return [3 /*break*/, 4];
                    case 4: return [4 /*yield*/, this.v2.send(new client_sesv2_1.GetEmailIdentityCommand({ EmailIdentity: domain }))];
                    case 5:
                        info = _f.sent();
                        tokens = (_d = (_c = info.DkimAttributes) === null || _c === void 0 ? void 0 : _c.Tokens) !== null && _d !== void 0 ? _d : [];
                        dkimRecords = tokens.map(function (t) { return ({
                            type: "CNAME",
                            name: "".concat(t, "._domainkey.").concat(domain),
                            value: "".concat(t, ".dkim.amazonses.com"),
                            // note: "Easy DKIM",
                        }); });
                        sesStatus = info.VerificationStatus || "PENDING";
                        status = sesStatus === "SUCCESS"
                            ? "verified"
                            : sesStatus === "PENDING"
                                ? "pending"
                                : sesStatus === "FAILED"
                                    ? "failed"
                                    : "unverified";
                        extraDns = [];
                        extraMeta = {};
                        if (!mailFrom) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.configureMailFrom(domain, mailFrom)];
                    case 6:
                        _a = _f.sent(), dns = _a.dns, meta = _a.meta;
                        extraDns = dns;
                        extraMeta = meta;
                        _f.label = 7;
                    case 7:
                        incomingDns = [];
                        if (incoming) {
                            // 1. Add MX record instruction for inbound
                            incomingDns.push({
                                type: "MX",
                                name: domain,
                                value: "10 inbound-smtp.".concat(this.cfg.region, ".amazonaws.com"),
                                note: "Route incoming email via SES inbound",
                            });
                        }
                        return [2 /*return*/, {
                                domain: domain,
                                status: status,
                                // dns,
                                dns: __spreadArray(__spreadArray(__spreadArray([], dkimRecords, true), extraDns, true), incomingDns, true),
                                meta: __assign({ sesStatus: sesStatus, signingAttributesOrigin: (_e = info.DkimAttributes) === null || _e === void 0 ? void 0 : _e.SigningAttributesOrigin }, (mailFrom ? { mailFrom: extraMeta } : {})),
                            }];
                }
            });
        });
    };
    SesMailer.prototype.configureMailFrom = function (domain, mailFrom) {
        return __awaiter(this, void 0, void 0, function () {
            var mf, info, feedbackHost, dns;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        mf = mailFrom.trim().replace(/\.$/, "");
                        if (!mf.endsWith(".".concat(domain))) {
                            throw new Error("MAIL FROM must be a subdomain of ".concat(domain));
                        }
                        return [4 /*yield*/, this.v2.send(new client_sesv2_1.PutEmailIdentityMailFromAttributesCommand({
                                EmailIdentity: domain,
                                MailFromDomain: mf,
                                // BehaviorOnMxFailure: "UseDefaultValue" | "RejectMessage"  // optional
                            }))];
                    case 1:
                        _d.sent();
                        return [4 /*yield*/, this.v2.send(new client_sesv2_1.GetEmailIdentityCommand({ EmailIdentity: domain }))];
                    case 2:
                        info = _d.sent();
                        feedbackHost = "feedback-smtp.".concat(this.cfg.region, ".amazonses.com");
                        dns = [
                            {
                                type: "MX",
                                name: mf,
                                value: "10 ".concat(feedbackHost),
                                priority: 10,
                                note: "Custom MAIL FROM (SPF alignment)",
                            },
                            {
                                type: "TXT",
                                name: mf,
                                value: "v=spf1 include:amazonses.com -all",
                                note: "Custom MAIL FROM (SPF alignment)",
                            },
                            {
                                type: "TXT",
                                name: "_dmarc.".concat(domain),
                                value: "v=DMARC1; p=none;",
                                note: "Recommended DMARC policy (start with p=none, strengthen later)",
                            },
                        ];
                        return [2 /*return*/, {
                                dns: dns,
                                meta: {
                                    mailFromDomain: (_a = info.MailFromAttributes) === null || _a === void 0 ? void 0 : _a.MailFromDomain,
                                    mailFromDomainStatus: (_b = info.MailFromAttributes) === null || _b === void 0 ? void 0 : _b.MailFromDomainStatus,
                                    behaviorOnMxFailure: (_c = info.MailFromAttributes) === null || _c === void 0 ? void 0 : _c.BehaviorOnMxFailure,
                                },
                            }];
                }
            });
        });
    };
    SesMailer.prototype.normalizeDomain = function (d) {
        return d.trim().replace(/\.$/, "").toLowerCase();
    };
    SesMailer.prototype.removeDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var d, e_5, notFound, _a;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        d = this.normalizeDomain(domain);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.send(new client_sesv2_1.DeleteEmailIdentityCommand({ EmailIdentity: d }))];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_5 = _c.sent();
                        notFound = (e_5 === null || e_5 === void 0 ? void 0 : e_5.name) === "NotFoundException" || ((_b = e_5 === null || e_5 === void 0 ? void 0 : e_5.$metadata) === null || _b === void 0 ? void 0 : _b.httpStatusCode) === 404;
                        if (!notFound)
                            throw e_5;
                        return [3 /*break*/, 4];
                    case 4:
                        _c.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, this.client.send(new client_sesv2_1.GetEmailIdentityCommand({ EmailIdentity: d }))];
                    case 5:
                        _c.sent();
                        // Still exists (race/permissions). Report current state as “pending/unknown”.
                        return [2 /*return*/, {
                                domain: d,
                                status: "unverified", // your enum: "unverified" | "pending" | "verified" | "failed"
                                dns: [],
                                meta: { deleted: false, reason: "still-present-after-delete" },
                            }];
                    case 6:
                        _a = _c.sent();
                        // Deleted (or not found) – return empty DNS and a deleted flag
                        return [2 /*return*/, {
                                domain: d,
                                status: "unverified",
                                dns: [],
                                meta: { deleted: true },
                            }];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    SesMailer.prototype.verifyDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var d, info, tokens, dkimRecords, mf, mailFromDns, sesStatus, status_1, e_6, notFound;
            var _a, _b, _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        d = this.normalizeDomain(domain);
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.v2.send(new client_sesv2_1.GetEmailIdentityCommand({ EmailIdentity: d }))];
                    case 2:
                        info = _j.sent();
                        console.log("info", info);
                        tokens = (_b = (_a = info.DkimAttributes) === null || _a === void 0 ? void 0 : _a.Tokens) !== null && _b !== void 0 ? _b : [];
                        dkimRecords = tokens.map(function (t) { return ({
                            type: "CNAME",
                            name: "".concat(t, "._domainkey.").concat(d),
                            value: "".concat(t, ".dkim.amazonses.com"),
                        }); });
                        mf = (_d = (_c = info.MailFromAttributes) === null || _c === void 0 ? void 0 : _c.MailFromDomain) === null || _d === void 0 ? void 0 : _d.trim().replace(/\.$/, "");
                        mailFromDns = mf
                            ? [
                                {
                                    type: "MX",
                                    name: mf,
                                    value: "10 feedback-smtp.".concat(this.cfg.region, ".amazonses.com"),
                                    priority: 10,
                                    note: "Custom MAIL FROM (SPF alignment)",
                                },
                                {
                                    type: "TXT",
                                    name: mf,
                                    value: "v=spf1 include:amazonses.com -all",
                                    note: "Custom MAIL FROM (SPF alignment)",
                                },
                            ]
                            : [];
                        sesStatus = info.VerificationStatus || "PENDING";
                        status_1 = sesStatus === "SUCCESS"
                            ? "verified"
                            : sesStatus === "PENDING"
                                ? "pending"
                                : sesStatus === "FAILED"
                                    ? "failed"
                                    : "unverified";
                        return [2 /*return*/, {
                                domain: d,
                                status: status_1,
                                dns: __spreadArray(__spreadArray([], dkimRecords, true), mailFromDns, true),
                                meta: {
                                    sesStatus: sesStatus,
                                    signingAttributesOrigin: (_e = info.DkimAttributes) === null || _e === void 0 ? void 0 : _e.SigningAttributesOrigin,
                                    mailFrom: mf
                                        ? {
                                            mailFromDomain: mf,
                                            mailFromDomainStatus: (_f = info.MailFromAttributes) === null || _f === void 0 ? void 0 : _f.MailFromDomainStatus,
                                            behaviorOnMxFailure: (_g = info.MailFromAttributes) === null || _g === void 0 ? void 0 : _g.BehaviorOnMxFailure,
                                        }
                                        : undefined,
                                    verificationInfo: info.VerificationInfo,
                                },
                            }];
                    case 3:
                        e_6 = _j.sent();
                        notFound = (e_6 === null || e_6 === void 0 ? void 0 : e_6.name) === "NotFoundException" || ((_h = e_6 === null || e_6 === void 0 ? void 0 : e_6.$metadata) === null || _h === void 0 ? void 0 : _h.httpStatusCode) === 404;
                        return [2 /*return*/, {
                                domain: d,
                                status: "unverified",
                                dns: [],
                                meta: {
                                    error: notFound ? "IdentityNotFound" : e_6 === null || e_6 === void 0 ? void 0 : e_6.name,
                                    message: e_6 === null || e_6 === void 0 ? void 0 : e_6.message,
                                },
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SesMailer.prototype.sendTestEmail = function (to, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var subject, body, from, err_3;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        subject = (_a = opts === null || opts === void 0 ? void 0 : opts.subject) !== null && _a !== void 0 ? _a : "Test email";
                        body = (_b = opts === null || opts === void 0 ? void 0 : opts.body) !== null && _b !== void 0 ? _b : "This is a test email from your configured SES account. Whats up";
                        from = "no-reply@kurrier.org";
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.send(new client_ses_1.SendEmailCommand({
                                Source: from,
                                Destination: { ToAddresses: [to] },
                                Message: {
                                    Subject: { Data: subject, Charset: "UTF-8" },
                                    Body: {
                                        Text: { Data: body, Charset: "UTF-8" },
                                        // Html: { Data: `<p>${body}</p>`, Charset: "UTF-8" }, // optional
                                    },
                                },
                            }))];
                    case 2:
                        _c.sent();
                        return [2 /*return*/, true];
                    case 3:
                        err_3 = _c.sent();
                        console.error("SES sendTestEmail error:", err_3);
                        return [2 /*return*/, false];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SesMailer.prototype.sendEmail = function (to, opts) {
        return __awaiter(this, void 0, void 0, function () {
            // const subject = opts?.subject ?? "Test email";
            // const body =
            //     opts?.body ??
            //     "This is a test email from your configured SES account. Whats up";
            // Must be a verified email or an address at a verified domain in this SES account/region
            // const from = (this.cfg as SesConfig).mailFrom ?? to;
            // const from = "no-reply@kurrier.org";
            // const base64Attachments = await Promise.all(
            //     opts.attachments.map(async (att) => {
            //         const arrayBuffer = await att.content.arrayBuffer();
            //         const base64 = Buffer.from(new Uint8Array(arrayBuffer)).toString("base64")
            //         return {
            //             FileName: att.name,
            //             // RawContent: new Uint8Array(arrayBuffer),   // ✅ correct type
            //             RawContent: base64,   // ✅ correct type
            //             ContentType: att.contentType || "application/octet-stream",
            //             ContentDisposition: "ATTACHMENT",
            //         };
            //     })
            // )
            // const base64Attachments = await Promise.all(
            //     (opts.attachments ?? []).map(async (att) => {
            //         const ab = await att.content.arrayBuffer();
            //         const bytes = new Uint8Array(ab);
            //
            //         return {
            //             FileName: att.name,                                  // not FileName
            //             RawContent: bytes,                                  // not RawContent, not base64 string
            //             // ContentType: att.contentType || att.content.type || "application/octet-stream",
            //             // ContentDisposition: "ATTACHMENT",
            //         } as const;
            //     })
            // );
            function toSesV2Attachments(inputs) {
                return __awaiter(this, void 0, void 0, function () {
                    var _this = this;
                    return __generator(this, function (_a) {
                        return [2 /*return*/, Promise.all(inputs.map(function (att) { return __awaiter(_this, void 0, void 0, function () {
                                var ab, bytes, out;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, att.content.arrayBuffer()];
                                        case 1:
                                            ab = _a.sent();
                                            bytes = new Uint8Array(ab);
                                            out = {
                                                FileName: att.name,
                                                RawContent: bytes, // <-- Uint8Array (do NOT base64 yourself)
                                                ContentType: att.contentType || att.content.type || "application/octet-stream",
                                                ContentTransferEncoding: "BASE64",
                                                // ContentDisposition: att.inline ? "INLINE" : "ATTACHMENT",
                                                // ...(att.contentId ? { ContentId: att.contentId } : {}),
                                            };
                                            return [2 /*return*/, out];
                                    }
                                });
                            }); }))];
                    });
                });
            }
            var base64Attachments, MessageId, err_4;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, toSesV2Attachments((_a = opts.attachments) !== null && _a !== void 0 ? _a : [])];
                    case 1:
                        base64Attachments = _b.sent();
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.v2.send(new client_sesv2_1.SendEmailCommand({
                                FromEmailAddress: opts.from,
                                Destination: { ToAddresses: to },
                                // Source: opts.from,
                                Content: {
                                    Simple: __assign(__assign({ Subject: { Data: opts.subject, Charset: "UTF-8" }, Body: {
                                            Text: { Data: opts.text, Charset: "UTF-8" },
                                            Html: { Data: opts.html, Charset: "UTF-8" }, // optional
                                        } }, (opts.attachments && opts.attachments.length > 0
                                        ? {
                                            Attachments: base64Attachments,
                                        }
                                        : {})), { Headers: this.buildSesHeaders(opts.inReplyTo, opts.references) }),
                                },
                            }))];
                    case 3:
                        MessageId = (_b.sent()).MessageId;
                        // await this.client.send(
                        //     new SendEmailCommandV2({
                        //         Source: opts.from,
                        //         Destination: { ToAddresses: to },
                        //         Message: {
                        //             Subject: { Data: opts.subject, Charset: "UTF-8" },
                        //             Body: {
                        //                 Text: { Data: opts.text, Charset: "UTF-8" },
                        //                 Html: { Data: opts.html, Charset: "UTF-8" }, // optional
                        //             },
                        //         },
                        //     }),
                        // );
                        return [2 /*return*/, {
                                MessageId: "<".concat(MessageId, "@").concat(this.cfg.region, ".amazonses.com>"),
                                success: true,
                            }];
                    case 4:
                        err_4 = _b.sent();
                        console.error("SES sendTestEmail error:", err_4);
                        return [2 /*return*/, { success: false }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    return SesMailer;
}());
exports.SesMailer = SesMailer;
