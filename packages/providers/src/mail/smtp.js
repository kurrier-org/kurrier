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
exports.SmtpMailer = void 0;
var nodemailer_1 = __importDefault(require("nodemailer"));
var core_1 = require("../core");
var imapflow_1 = require("imapflow");
var SmtpMailer = /** @class */ (function () {
    function SmtpMailer(cfg) {
        var _a, _b;
        this.transporter = nodemailer_1.default.createTransport({
            host: cfg.host,
            port: cfg.port,
            secure: (_a = cfg.secure) !== null && _a !== void 0 ? _a : cfg.port === 465,
            auth: cfg.auth,
            pool: (_b = cfg.pool) !== null && _b !== void 0 ? _b : false,
        });
        this.imapClient = cfg.imap
            ? new imapflow_1.ImapFlow({
                host: cfg.imap.host,
                port: cfg.imap.port,
                secure: cfg.imap.secure,
                auth: {
                    user: cfg.imap.user,
                    pass: cfg.imap.pass,
                },
            })
            : null;
    }
    SmtpMailer.from = function (raw) {
        var cfg = core_1.RawSmtpConfigSchema.parse(raw);
        return new SmtpMailer(cfg);
    };
    SmtpMailer.prototype.verify = function () {
        return __awaiter(this, void 0, void 0, function () {
            var meta, ok, err_1, _a, _b, err_2;
            var _c, _d, _e, _f, _g, _h;
            return __generator(this, function (_j) {
                switch (_j.label) {
                    case 0:
                        meta = { send: false, receive: undefined };
                        _j.label = 1;
                    case 1:
                        _j.trys.push([1, 17, 18, 19]);
                        return [4 /*yield*/, this.transporter.verify()];
                    case 2:
                        ok = _j.sent();
                        meta.send = !!ok;
                        if (!this.imapClient) return [3 /*break*/, 16];
                        _j.label = 3;
                    case 3:
                        _j.trys.push([3, 6, 7, 16]);
                        return [4 /*yield*/, this.imapClient.connect()];
                    case 4:
                        _j.sent();
                        return [4 /*yield*/, this.imapClient.noop()];
                    case 5:
                        _j.sent();
                        meta.receive = true;
                        return [3 /*break*/, 16];
                    case 6:
                        err_1 = _j.sent();
                        meta.receive = false;
                        meta.response = (_c = err_1 === null || err_1 === void 0 ? void 0 : err_1.message) !== null && _c !== void 0 ? _c : String(err_1);
                        return [3 /*break*/, 16];
                    case 7:
                        if (!((_d = this.imapClient) === null || _d === void 0 ? void 0 : _d.authenticated)) return [3 /*break*/, 12];
                        _j.label = 8;
                    case 8:
                        _j.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, this.imapClient.logout()];
                    case 9:
                        _j.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        _a = _j.sent();
                        return [3 /*break*/, 11];
                    case 11: return [3 /*break*/, 15];
                    case 12:
                        _j.trys.push([12, 14, , 15]);
                        return [4 /*yield*/, ((_e = this.imapClient) === null || _e === void 0 ? void 0 : _e.close())];
                    case 13:
                        _j.sent();
                        return [3 /*break*/, 15];
                    case 14:
                        _b = _j.sent();
                        return [3 /*break*/, 15];
                    case 15: return [7 /*endfinally*/];
                    case 16: return [2 /*return*/, { ok: true, message: "OK", meta: meta }];
                    case 17:
                        err_2 = _j.sent();
                        return [2 /*return*/, {
                                ok: false,
                                message: (_f = err_2 === null || err_2 === void 0 ? void 0 : err_2.message) !== null && _f !== void 0 ? _f : "SMTP verify failed",
                                meta: { code: err_2 === null || err_2 === void 0 ? void 0 : err_2.code, response: (err_2 === null || err_2 === void 0 ? void 0 : err_2.response) || (err_2 === null || err_2 === void 0 ? void 0 : err_2.responseText) },
                            }];
                    case 18:
                        try {
                            (_h = (_g = this.transporter).close) === null || _h === void 0 ? void 0 : _h.call(_g);
                        }
                        catch (_k) { }
                        return [7 /*endfinally*/];
                    case 19: return [2 /*return*/];
                }
            });
        });
    };
    SmtpMailer.prototype.sendTestEmail = function (to, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var err_3;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.transporter.sendMail({
                                from: this.transporter.options.auth.user,
                                to: to,
                                subject: (_a = opts === null || opts === void 0 ? void 0 : opts.subject) !== null && _a !== void 0 ? _a : "Test email",
                                text: (_b = opts === null || opts === void 0 ? void 0 : opts.body) !== null && _b !== void 0 ? _b : "This is a test email from your configured provider.",
                            })];
                    case 1:
                        _c.sent();
                        return [2 /*return*/, true];
                    case 2:
                        err_3 = _c.sent();
                        console.error("sendTestEmail error", err_3);
                        return [2 /*return*/, false];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    SmtpMailer.prototype.addDomain = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        domain: "",
                        status: "unverified",
                        dns: [],
                        meta: { info: "SMTP does not support domain identities" },
                    }];
            });
        });
    };
    SmtpMailer.prototype.removeDomain = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        domain: "",
                        status: "unverified",
                        dns: [],
                        meta: { info: "SMTP does not support domain identities" },
                    }];
            });
        });
    };
    SmtpMailer.prototype.verifyDomain = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        domain: "",
                        status: "unverified",
                        dns: [],
                        meta: { info: "SMTP does not support domain identities" },
                    }];
            });
        });
    };
    SmtpMailer.prototype.addEmail = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    SmtpMailer.prototype.removeEmail = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {}];
            });
        });
    };
    SmtpMailer.prototype.sendEmail = function (to, opts) {
        return __awaiter(this, void 0, void 0, function () {
            var attachments, headers, info, err_4;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, Promise.all(((_a = opts.attachments) !== null && _a !== void 0 ? _a : []).map(function (a) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, _b;
                                var _c;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0:
                                            _c = {
                                                filename: a.name
                                            };
                                            _b = (_a = Buffer).from;
                                            return [4 /*yield*/, a.content.arrayBuffer()];
                                        case 1: return [2 /*return*/, (_c.content = _b.apply(_a, [_d.sent()]),
                                                _c.contentType = a.contentType || "application/octet-stream",
                                                _c)];
                                    }
                                });
                            }); }))];
                    case 1:
                        attachments = _c.sent();
                        headers = {};
                        if (opts.inReplyTo)
                            headers["In-Reply-To"] = opts.inReplyTo;
                        if ((_b = opts.references) === null || _b === void 0 ? void 0 : _b.length)
                            headers["References"] = opts.references.join(" ");
                        return [4 /*yield*/, this.transporter.sendMail({
                                from: opts.from,
                                to: to, // array is fine; Nodemailer will join
                                subject: opts.subject,
                                text: opts.text || undefined,
                                html: opts.html || undefined,
                                headers: headers,
                                attachments: attachments,
                            })];
                    case 2:
                        info = _c.sent();
                        return [2 /*return*/, { success: true, MessageId: String(info.messageId || "") }];
                    case 3:
                        err_4 = _c.sent();
                        // You can add logging here if desired
                        return [2 /*return*/, { success: false }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return SmtpMailer;
}());
exports.SmtpMailer = SmtpMailer;
