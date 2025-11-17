"use strict";
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
exports.SendgridMailer = void 0;
// @ts-nocheck
var core_1 = require("../core");
var client_1 = __importDefault(require("@sendgrid/client"));
var mail_1 = __importDefault(require("@sendgrid/mail"));
var mail_client_1 = require("@common/mail-client");
var SendgridMailer = /** @class */ (function () {
    function SendgridMailer(cfg) {
        this.cfg = cfg;
        this.client = new client_1.default.Client();
        this.mailClient = mail_1.default;
        this.client.setApiKey(cfg.sendgridApiKey);
        mail_1.default.setApiKey(cfg.sendgridApiKey);
    }
    SendgridMailer.from = function (raw) {
        var cfg = core_1.RawSendgridConfigSchema.parse(raw);
        return new SendgridMailer(cfg);
    };
    SendgridMailer.prototype.verify = function () {
        return __awaiter(this, void 0, void 0, function () {
            var err_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.mailClient.send({
                                to: "probe@example.com",
                                from: "probe@example.com",
                                subject: "probe",
                                text: "probe",
                                mailSettings: { sandboxMode: { enable: true } }, // no real send
                            }, false)];
                    case 1:
                        _c.sent();
                        return [2 /*return*/, {
                                ok: true,
                                message: "OK",
                                meta: { provider: "sendgrid", send: true },
                            }];
                    case 2:
                        err_1 = _c.sent();
                        return [2 /*return*/, {
                                ok: false,
                                message: (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) !== null && _a !== void 0 ? _a : "SendGrid verify failed",
                                meta: { code: err_1 === null || err_1 === void 0 ? void 0 : err_1.code, response: (_b = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _b === void 0 ? void 0 : _b.body },
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SendgridMailer.prototype.sendTestEmail = function (to, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var res, err_2;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.mailClient.send({
                                to: to,
                                from: (_a = opts === null || opts === void 0 ? void 0 : opts.from) !== null && _a !== void 0 ? _a : "no-reply@kurrier.org",
                                subject: (_b = opts === null || opts === void 0 ? void 0 : opts.subject) !== null && _b !== void 0 ? _b : "Test email",
                                text: (_c = opts === null || opts === void 0 ? void 0 : opts.body) !== null && _c !== void 0 ? _c : "This is a test email from your configured provider.",
                                // If you want a dry run, uncomment sandbox:
                                // mailSettings: { sandboxMode: { enable: true } },
                            })];
                    case 1:
                        res = _d.sent();
                        return [2 /*return*/, true];
                    case 2:
                        err_2 = _d.sent();
                        console.error("sendTestEmail error", err_2);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SendgridMailer.prototype.upsertInboundParse = function (hostname, webhookUrl, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var spamCheck, listRes, all, existing, createRes;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        spamCheck = (_a = opts === null || opts === void 0 ? void 0 : opts.spamCheck) !== null && _a !== void 0 ? _a : true;
                        return [4 /*yield*/, this.client.request({
                                method: "GET",
                                url: "/v3/user/webhooks/parse/settings",
                            })];
                    case 1:
                        listRes = (_c.sent())[0];
                        all = (_b = listRes.body.result) !== null && _b !== void 0 ? _b : [];
                        existing = all.find(function (s) { var _a; return ((_a = s.hostname) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === hostname.toLowerCase(); });
                        if (!existing) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.client.request({
                                method: "DELETE",
                                url: "/v3/user/webhooks/parse/settings/".concat(existing.hostname),
                            })];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [4 /*yield*/, this.client.request({
                            method: "POST",
                            url: "/v3/user/webhooks/parse/settings",
                            body: {
                                hostname: hostname,
                                url: webhookUrl,
                                spam_check: spamCheck,
                                send_raw: true,
                            },
                        })];
                    case 4:
                        createRes = (_c.sent())[0];
                        return [2 /*return*/, createRes.body];
                }
            });
        });
    };
    SendgridMailer.prototype.addDomain = function (domain, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var res, body, dns, status_1, err_3;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.client.request({
                                method: "POST",
                                url: "/v3/whitelabel/domains",
                                body: {
                                    domain: domain, // e.g. "kurrier.org"
                                    automatic_security: true,
                                    custom_spf: false,
                                    default: true,
                                },
                            })];
                    case 1:
                        res = (_d.sent())[0];
                        body = res.body;
                        dns = [
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
                        status_1 = body.valid ? "verified" : "unverified";
                        return [2 /*return*/, {
                                domain: body.domain,
                                status: status_1,
                                dns: dns,
                                meta: {
                                    id: body.id,
                                    user_id: body.user_id,
                                    subdomain: body.subdomain,
                                    base_domain_requested: domain,
                                    default: body.default,
                                    automatic_security: body.automatic_security,
                                    sendgrid_raw: body,
                                },
                            }];
                    case 2:
                        err_3 = _d.sent();
                        return [2 /*return*/, {
                                domain: domain,
                                status: "failed",
                                dns: [],
                                meta: { error: (_c = (_b = (_a = err_3 === null || err_3 === void 0 ? void 0 : err_3.response) === null || _a === void 0 ? void 0 : _a.body) !== null && _b !== void 0 ? _b : err_3 === null || err_3 === void 0 ? void 0 : err_3.message) !== null && _c !== void 0 ? _c : String(err_3) },
                            }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SendgridMailer.prototype.removeDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var listRes, all, parse, e_1, listRes, all, dom, e_2;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 4, , 5]);
                        return [4 /*yield*/, this.client.request({
                                method: "GET",
                                url: "/v3/user/webhooks/parse/settings",
                            })];
                    case 1:
                        listRes = (_c.sent())[0];
                        all = (_a = listRes.body.result) !== null && _a !== void 0 ? _a : [];
                        parse = all.find(function (s) { var _a; return ((_a = s.hostname) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === domain.toLowerCase(); });
                        if (!parse) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.client.request({
                                method: "DELETE",
                                url: "/v3/user/webhooks/parse/settings/".concat(parse.id),
                            })];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [3 /*break*/, 5];
                    case 4:
                        e_1 = _c.sent();
                        console.warn("removeDomain: inbound parse delete error", e_1);
                        return [3 /*break*/, 5];
                    case 5:
                        _c.trys.push([5, 9, , 10]);
                        return [4 /*yield*/, this.client.request({
                                method: "GET",
                                url: "/v3/whitelabel/domains",
                            })];
                    case 6:
                        listRes = (_c.sent())[0];
                        all = (_b = listRes.body) !== null && _b !== void 0 ? _b : [];
                        dom = all.find(function (x) { return _this.normalizeDomain(x.domain) === domain; });
                        if (!dom) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.client.request({
                                method: "DELETE",
                                url: "/v3/whitelabel/domains/".concat(dom.id),
                            })];
                    case 7:
                        _c.sent();
                        _c.label = 8;
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        e_2 = _c.sent();
                        console.warn("removeDomain: domain delete error", e_2);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/, {
                            domain: domain,
                            status: "unverified", // since it’s gone, treat as unverified
                            dns: [],
                            meta: { deleted: true },
                        }];
                }
            });
        });
    };
    SendgridMailer.prototype.verifyDomain = function (domain, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var webHookUrl, listRes, all, match, id, getRes, details, valRes, validation, dns, status_2, e_3;
            var _a, _b, _c, _d, _e, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        if (opts) {
                            webHookUrl = opts.webHookUrl;
                        }
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 7, , 8]);
                        return [4 /*yield*/, this.client.request({
                                method: "GET",
                                url: "/v3/whitelabel/domains",
                            })];
                    case 2:
                        listRes = (_g.sent())[0];
                        all = listRes.body || [];
                        match = all.find(function (row) { return String(row.domain).toLowerCase() === domain; });
                        if (!match) {
                            return [2 /*return*/, {
                                    domain: d,
                                    status: "unverified",
                                    dns: [],
                                    meta: { error: "IdentityNotFound" },
                                }];
                        }
                        id = match.id;
                        return [4 /*yield*/, this.client.request({
                                method: "GET",
                                url: "/v3/whitelabel/domains/".concat(id),
                            })];
                    case 3:
                        getRes = (_g.sent())[0];
                        details = getRes.body;
                        return [4 /*yield*/, this.client.request({
                                method: "POST",
                                url: "/v3/whitelabel/domains/".concat(id, "/validate"),
                            })];
                    case 4:
                        valRes = (_g.sent())[0];
                        validation = valRes.body;
                        dns = [];
                        if ((_a = details.dns) === null || _a === void 0 ? void 0 : _a.mail_cname) {
                            dns.push({
                                type: "CNAME",
                                name: details.dns.mail_cname.host,
                                value: details.dns.mail_cname.data,
                                note: "SendGrid mail CNAME",
                            });
                        }
                        if ((_b = details.dns) === null || _b === void 0 ? void 0 : _b.dkim1) {
                            dns.push({
                                type: "CNAME",
                                name: details.dns.dkim1.host,
                                value: details.dns.dkim1.data,
                                note: "SendGrid DKIM key 1",
                            });
                        }
                        if ((_c = details.dns) === null || _c === void 0 ? void 0 : _c.dkim2) {
                            dns.push({
                                type: "CNAME",
                                name: details.dns.dkim2.host,
                                value: details.dns.dkim2.data,
                                note: "SendGrid DKIM key 2",
                            });
                        }
                        status_2 = validation.valid
                            ? "verified"
                            : "unverified";
                        if (!validation.valid) return [3 /*break*/, 6];
                        return [4 /*yield*/, this.upsertInboundParse(domain, webHookUrl)];
                    case 5:
                        _g.sent();
                        _g.label = 6;
                    case 6: return [2 /*return*/, {
                            domain: details.domain,
                            status: status_2,
                            dns: dns,
                            meta: {
                                id: id,
                                subdomain: details.subdomain,
                                validation: validation,
                                sendgrid_raw_domain: details,
                            },
                        }];
                    case 7:
                        e_3 = _g.sent();
                        return [2 /*return*/, {
                                domain: domain,
                                status: "failed",
                                dns: [],
                                meta: {
                                    error: (_f = (_e = (_d = e_3 === null || e_3 === void 0 ? void 0 : e_3.response) === null || _d === void 0 ? void 0 : _d.body) !== null && _e !== void 0 ? _e : e_3 === null || e_3 === void 0 ? void 0 : e_3.message) !== null && _f !== void 0 ? _f : String(e_3),
                                },
                            }];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    SendgridMailer.prototype.addEmail = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    SendgridMailer.prototype.removeEmail = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    SendgridMailer.prototype.sendEmail = function (to, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var attachments, _a, headers, msg, response, messageId, err_4;
            var _this = this;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _e.trys.push([0, 5, , 6]);
                        if (!opts.attachments) return [3 /*break*/, 2];
                        return [4 /*yield*/, Promise.all(opts.attachments.map(function (a) { return __awaiter(_this, void 0, void 0, function () {
                                var buf, _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            _b = (_a = Buffer).from;
                                            return [4 /*yield*/, a.content.arrayBuffer()];
                                        case 1:
                                            buf = _b.apply(_a, [_c.sent()]);
                                            return [2 /*return*/, {
                                                    content: buf.toString("base64"),
                                                    filename: (0, mail_client_1.sanitizeFilename)(a.name),
                                                    type: a.contentType || "application/octet-stream",
                                                    disposition: "attachment",
                                                }];
                                    }
                                });
                            }); }))];
                    case 1:
                        _a = _e.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = undefined;
                        _e.label = 3;
                    case 3:
                        attachments = _a;
                        headers = {};
                        if (opts.inReplyTo)
                            headers["In-Reply-To"] = opts.inReplyTo;
                        if ((_b = opts.references) === null || _b === void 0 ? void 0 : _b.length)
                            headers["References"] = opts.references.join(" ");
                        msg = {
                            from: opts.from,
                            to: to,
                            subject: opts.subject,
                            text: opts.text || undefined,
                            html: opts.html || undefined,
                            headers: headers,
                            attachments: attachments,
                        };
                        return [4 /*yield*/, this.mailClient.send(msg, { sandbox: false })];
                    case 4:
                        response = (_e.sent())[0];
                        messageId = ((_c = response === null || response === void 0 ? void 0 : response.headers) === null || _c === void 0 ? void 0 : _c["x-message-id"]) ||
                            ((_d = response === null || response === void 0 ? void 0 : response.headers) === null || _d === void 0 ? void 0 : _d["X-Message-Id"]);
                        return [2 /*return*/, {
                                success: true,
                                MessageId: messageId ? String(messageId) : undefined,
                            }];
                    case 5:
                        err_4 = _e.sent();
                        console.error("sendEmail error", err_4);
                        return [2 /*return*/, { success: false }];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return SendgridMailer;
}());
exports.SendgridMailer = SendgridMailer;
