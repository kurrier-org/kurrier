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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostmarkMailer = void 0;
// @ts-nocheck
var core_1 = require("../core");
var postmark_1 = __importDefault(require("postmark"));
var mail_client_1 = require("@common/mail-client");
var PostmarkMailer = /** @class */ (function () {
    function PostmarkMailer(cfg) {
        this.cfg = cfg;
        this.serverClient = new postmark_1.default.ServerClient(cfg.postmarkServerToken);
        this.accountClient = new postmark_1.default.AccountClient(cfg.postmarkAccountToken);
    }
    PostmarkMailer.from = function (raw) {
        var cfg = core_1.RawPostmarkConfigSchema.parse(raw);
        return new PostmarkMailer(cfg);
    };
    PostmarkMailer.prototype.verify = function () {
        return __awaiter(this, void 0, void 0, function () {
            var server, err_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.serverClient.getServer()];
                    case 1:
                        server = _b.sent();
                        return [2 /*return*/, {
                                ok: true,
                                message: "Postmark server verified",
                                meta: {
                                    provider: "postmark",
                                    send: true,
                                    serverId: server.ID,
                                    serverName: server.Name,
                                },
                            }];
                    case 2:
                        err_1 = _b.sent();
                        return [2 /*return*/, {
                                ok: false,
                                message: (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) !== null && _a !== void 0 ? _a : "Postmark verify failed",
                                meta: { status: err_1 === null || err_1 === void 0 ? void 0 : err_1.status, details: err_1 },
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    PostmarkMailer.prototype.sendTestEmail = function (to, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var err_2;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.serverClient.sendEmail({
                                From: (_a = opts === null || opts === void 0 ? void 0 : opts.from) !== null && _a !== void 0 ? _a : "no-reply@kurrier.org",
                                To: to,
                                Subject: (_b = opts === null || opts === void 0 ? void 0 : opts.subject) !== null && _b !== void 0 ? _b : "Test email",
                                TextBody: (_c = opts === null || opts === void 0 ? void 0 : opts.body) !== null && _c !== void 0 ? _c : "This is a test email from your configured Postmark provider.",
                            })];
                    case 1:
                        _d.sent();
                        return [2 /*return*/, true];
                    case 2:
                        err_2 = _d.sent();
                        console.error("Postmark sendTestEmail error", err_2);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    PostmarkMailer.prototype.addDomain = function (domain_1) {
        return __awaiter(this, arguments, void 0, function (domain, opts) {
            var list, match, created, createdDom, details, dns, status_1, err_3;
            var _a;
            if (opts === void 0) { opts = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.accountClient.getDomains()];
                    case 1:
                        list = _b.sent();
                        match = list.Domains.find(function (dom) { return dom.Name.toLowerCase() === domain.toLowerCase(); });
                        created = false;
                        if (!!match) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.accountClient.createDomain(__assign({ Name: domain }, (opts.returnPathDomain
                                ? { ReturnPathDomain: this.normalizeDomain(opts.returnPathDomain) }
                                : {})))];
                    case 2:
                        createdDom = _b.sent();
                        created = true;
                        match = { ID: createdDom.ID, Name: createdDom.Name };
                        _b.label = 3;
                    case 3: return [4 /*yield*/, this.accountClient.getDomain(match.ID)];
                    case 4:
                        details = _b.sent();
                        dns = [];
                        dns.push({
                            type: "MX",
                            name: domain,
                            value: "inbound.postmarkapp.com",
                            note: "MX (for inbound email)",
                        });
                        // SPF TXT
                        if (details.SPFHost && details.SPFTextValue) {
                            dns.push({
                                type: "TXT",
                                name: details.SPFHost,
                                value: details.SPFTextValue,
                                note: "SPF (".concat(details.SPFVerified ? "valid" : "pending", ")"),
                            });
                        }
                        // DKIM (current) TXT
                        if (details.DKIMHost && details.DKIMTextValue) {
                            dns.push({
                                type: "TXT",
                                name: details.DKIMHost,
                                value: details.DKIMTextValue,
                                note: "DKIM (".concat(details.DKIMVerified ? "valid" : "pending", ")"),
                            });
                        }
                        // DKIM (pending) TXT – Postmark provides a separate pending key when rotating/initializing
                        if (details.DKIMPendingHost && details.DKIMPendingTextValue) {
                            dns.push({
                                type: "TXT",
                                name: details.DKIMPendingHost,
                                value: details.DKIMPendingTextValue,
                                note: "DKIM (pending)",
                            });
                        }
                        // DKIM (revoked) TXT – show it so users know what can be removed
                        if (details.DKIMRevokedHost && details.DKIMRevokedTextValue) {
                            dns.push({
                                type: "TXT",
                                name: details.DKIMRevokedHost,
                                value: details.DKIMRevokedTextValue,
                                note: "DKIM (revoked".concat(details.SafeToRemoveRevokedKeyFromDNS ? ", safe to remove" : "", ")"),
                            });
                        }
                        // Return-Path CNAME
                        if (details.ReturnPathDomain && details.ReturnPathDomainCNAMEValue) {
                            dns.push({
                                type: "CNAME",
                                name: details.ReturnPathDomain,
                                value: details.ReturnPathDomainCNAMEValue,
                                note: "Return-Path (".concat(details.ReturnPathDomainVerified ? "valid" : "pending", ")"),
                            });
                        }
                        status_1 = details.SPFVerified && details.DKIMVerified ? "verified" : "unverified";
                        return [2 /*return*/, {
                                domain: details.Name,
                                status: status_1,
                                dns: dns,
                                meta: {
                                    postmark_raw: details,
                                    created: created,
                                    id: details.ID,
                                    dkimUpdateStatus: details.DKIMUpdateStatus,
                                    weakDkim: details.WeakDKIM,
                                    safeToRemoveRevokedKey: details.SafeToRemoveRevokedKeyFromDNS,
                                },
                            }];
                    case 5:
                        err_3 = _b.sent();
                        return [2 /*return*/, {
                                domain: domain,
                                status: "failed",
                                dns: [],
                                meta: { error: (_a = err_3 === null || err_3 === void 0 ? void 0 : err_3.message) !== null && _a !== void 0 ? _a : String(err_3) },
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    PostmarkMailer.prototype.normalizeDomain = function (d) {
        return d.trim().replace(/\.$/, "").toLowerCase();
    };
    PostmarkMailer.prototype.removeDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var d, listRes, all, parse, e_1, listRes, all, dom, e_2;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        d = this.normalizeDomain(domain);
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.client.request({
                                method: "GET",
                                url: "/v3/user/webhooks/parse/settings",
                            })];
                    case 2:
                        listRes = (_c.sent())[0];
                        all = (_a = listRes.body.result) !== null && _a !== void 0 ? _a : [];
                        parse = all.find(function (s) { var _a; return ((_a = s.hostname) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === d.toLowerCase(); });
                        if (!parse) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.client.request({
                                method: "DELETE",
                                url: "/v3/user/webhooks/parse/settings/".concat(parse.id),
                            })];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        e_1 = _c.sent();
                        console.warn("removeDomain: inbound parse delete error", e_1);
                        return [3 /*break*/, 6];
                    case 6:
                        _c.trys.push([6, 10, , 11]);
                        return [4 /*yield*/, this.client.request({
                                method: "GET",
                                url: "/v3/whitelabel/domains",
                            })];
                    case 7:
                        listRes = (_c.sent())[0];
                        all = (_b = listRes.body) !== null && _b !== void 0 ? _b : [];
                        dom = all.find(function (x) { return _this.normalizeDomain(x.domain) === d; });
                        if (!dom) return [3 /*break*/, 9];
                        return [4 /*yield*/, this.client.request({
                                method: "DELETE",
                                url: "/v3/whitelabel/domains/".concat(dom.id),
                            })];
                    case 8:
                        _c.sent();
                        _c.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        e_2 = _c.sent();
                        console.warn("removeDomain: domain delete error", e_2);
                        return [3 /*break*/, 11];
                    case 11: return [2 /*return*/, {
                            domain: d,
                            status: "unverified", // since it’s gone, treat as unverified
                            dns: [],
                            meta: { deleted: true },
                        }];
                }
            });
        });
    };
    PostmarkMailer.prototype.verifyDomain = function (domain_1) {
        return __awaiter(this, arguments, void 0, function (domain, opts) {
            var hook, list, match, details, dns, isVerified, status_2, inboundConfigured, server, res, err_4;
            var _a, _b;
            if (opts === void 0) { opts = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        hook = (_a = opts.webHookUrl) === null || _a === void 0 ? void 0 : _a.trim();
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, this.accountClient.getDomains()];
                    case 2:
                        list = _c.sent();
                        match = list.Domains.find(function (x) { return x.Name.toLowerCase() === domain.toLowerCase(); });
                        if (!match) {
                            return [2 /*return*/, {
                                    domain: domain,
                                    status: "unverified",
                                    dns: [],
                                    meta: { error: "Domain not found in Postmark account." },
                                }];
                        }
                        return [4 /*yield*/, this.accountClient.getDomain(match.ID)];
                    case 3:
                        details = _c.sent();
                        dns = [];
                        dns.push({
                            type: "MX",
                            name: domain,
                            value: "inbound.postmarkapp.com",
                            note: "MX (for inbound email)",
                        });
                        // SPF (TXT)
                        if (details.SPFHost && details.SPFTextValue) {
                            dns.push({
                                type: "TXT",
                                name: details.SPFHost,
                                value: details.SPFTextValue,
                                note: "SPF (".concat(details.SPFVerified ? "valid" : "pending", ")"),
                            });
                        }
                        // DKIM (TXT): prefer active, else show pending DKIM record
                        if (details.DKIMHost && details.DKIMTextValue) {
                            dns.push({
                                type: "TXT",
                                name: details.DKIMHost,
                                value: details.DKIMTextValue,
                                note: "DKIM (".concat(details.DKIMVerified ? "valid" : "pending", ")"),
                            });
                        }
                        else if (details.DKIMPendingHost && details.DKIMPendingTextValue) {
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
                                note: "Return-Path (".concat(details.ReturnPathDomainVerified ? "valid" : "pending", ")"),
                            });
                        }
                        isVerified = !!(details.SPFVerified && details.DKIMVerified);
                        status_2 = isVerified ? "verified" : "unverified";
                        inboundConfigured = void 0;
                        if (!(isVerified && hook)) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.serverClient.getServer()];
                    case 4:
                        server = _c.sent();
                        return [4 /*yield*/, this.serverClient.editServer({
                                Name: server.Name,
                                InboundHookUrl: hook,
                                InboundDomain: server.InboundDomain || domain,
                                RawEmailEnabled: true,
                            })];
                    case 5:
                        res = _c.sent();
                        inboundConfigured = { updated: true };
                        _c.label = 6;
                    case 6: return [2 /*return*/, {
                            domain: details.Name,
                            status: status_2,
                            dns: dns,
                            meta: {
                                postmark_raw: details,
                                inboundConfigured: inboundConfigured,
                            },
                        }];
                    case 7:
                        err_4 = _c.sent();
                        return [2 /*return*/, {
                                domain: domain,
                                status: "failed",
                                dns: [],
                                meta: { error: (_b = err_4 === null || err_4 === void 0 ? void 0 : err_4.message) !== null && _b !== void 0 ? _b : String(err_4) },
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    PostmarkMailer.prototype.addEmail = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    PostmarkMailer.prototype.removeDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var domains, match, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 5, , 6]);
                        return [4 /*yield*/, this.accountClient.getDomains()];
                    case 1:
                        domains = _a.sent();
                        match = domains.Domains.find(function (d) { return d.Name.toLowerCase() === domain.toLowerCase(); });
                        if (!match) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.accountClient.deleteDomain(match.ID)];
                    case 2:
                        _a.sent();
                        console.log("Deleted Postmark domain ".concat(domain, " (ID=").concat(match.ID, ")"));
                        return [3 /*break*/, 4];
                    case 3:
                        console.warn("Domain ".concat(domain, " not found in Postmark account"));
                        _a.label = 4;
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        e_3 = _a.sent();
                        console.warn("removeDomain: domain delete error", e_3);
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/, {
                            domain: domain,
                            status: "unverified", // treat as removed
                            dns: [],
                            meta: { deleted: true },
                        }];
                }
            });
        });
    };
    PostmarkMailer.prototype.removeEmail = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    PostmarkMailer.prototype.sendEmail = function (to, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var Attachments, _a, Headers_1, res, err_5;
            var _this = this;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 5, , 6]);
                        if (!(opts.attachments && opts.attachments.length)) return [3 /*break*/, 2];
                        return [4 /*yield*/, Promise.all(opts.attachments.map(function (a) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, _b;
                                var _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _c = {
                                                Name: (0, mail_client_1.sanitizeFilename)(a.name)
                                            };
                                            _b = (_a = Buffer).from;
                                            return [4 /*yield*/, a.content.arrayBuffer()];
                                        case 1: return [2 /*return*/, (_c.Content = _b.apply(_a, [_d.sent()]).toString("base64"),
                                                _c.ContentType = a.contentType || "application/octet-stream",
                                                _c)];
                                    }
                                });
                            }); }))];
                    case 1:
                        _a = _d.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = undefined;
                        _d.label = 3;
                    case 3:
                        Attachments = _a;
                        Headers_1 = [];
                        if (opts.inReplyTo)
                            Headers_1.push({ Name: "In-Reply-To", Value: opts.inReplyTo });
                        if ((_b = opts.references) === null || _b === void 0 ? void 0 : _b.length)
                            Headers_1.push({ Name: "References", Value: opts.references.join(" ") });
                        return [4 /*yield*/, this.serverClient.sendEmail({
                                From: opts.from,
                                To: to.join(","), // Postmark accepts comma-separated list
                                Subject: opts.subject,
                                TextBody: opts.text || undefined,
                                HtmlBody: opts.html || undefined,
                                Headers: Headers_1.length ? Headers_1 : undefined,
                                Attachments: Attachments,
                                // MessageStream: "outbound",  // optionally set a specific stream
                                // TrackOpens: true,           // optional tracking flags
                            })];
                    case 4:
                        res = _d.sent();
                        // Postmark returns { MessageID, ErrorCode, Message, ... }
                        if (res.ErrorCode && res.ErrorCode !== 0) {
                            console.error("Postmark sendEmail error", res);
                            return [2 /*return*/, { success: false, error: res.Message || "Postmark send error" }];
                        }
                        return [2 /*return*/, { success: true, MessageId: String(res.MessageID) }];
                    case 5:
                        err_5 = _d.sent();
                        console.error("Postmark sendEmail exception", err_5);
                        return [2 /*return*/, {
                                success: false,
                                error: (_c = err_5 === null || err_5 === void 0 ? void 0 : err_5.message) !== null && _c !== void 0 ? _c : "Postmark send exception",
                            }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return PostmarkMailer;
}());
exports.PostmarkMailer = PostmarkMailer;
