"use strict";
var __assign =
	(this && this.__assign) ||
	function () {
		__assign =
			Object.assign ||
			function (t) {
				for (var s, i = 1, n = arguments.length; i < n; i++) {
					s = arguments[i];
					for (var p in s)
						if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
				}
				return t;
			};
		return __assign.apply(this, arguments);
	};
var __awaiter =
	(this && this.__awaiter) ||
	function (thisArg, _arguments, P, generator) {
		function adopt(value) {
			return value instanceof P
				? value
				: new P(function (resolve) {
						resolve(value);
					});
		}
		return new (P || (P = Promise))(function (resolve, reject) {
			function fulfilled(value) {
				try {
					step(generator.next(value));
				} catch (e) {
					reject(e);
				}
			}
			function rejected(value) {
				try {
					step(generator["throw"](value));
				} catch (e) {
					reject(e);
				}
			}
			function step(result) {
				result.done
					? resolve(result.value)
					: adopt(result.value).then(fulfilled, rejected);
			}
			step((generator = generator.apply(thisArg, _arguments || [])).next());
		});
	};
var __generator =
	(this && this.__generator) ||
	function (thisArg, body) {
		var _ = {
				label: 0,
				sent: function () {
					if (t[0] & 1) throw t[1];
					return t[1];
				},
				trys: [],
				ops: [],
			},
			f,
			y,
			t,
			g = Object.create(
				(typeof Iterator === "function" ? Iterator : Object).prototype,
			);
		return (
			(g.next = verb(0)),
			(g["throw"] = verb(1)),
			(g["return"] = verb(2)),
			typeof Symbol === "function" &&
				(g[Symbol.iterator] = function () {
					return this;
				}),
			g
		);
		function verb(n) {
			return function (v) {
				return step([n, v]);
			};
		}
		function step(op) {
			if (f) throw new TypeError("Generator is already executing.");
			while ((g && ((g = 0), op[0] && (_ = 0)), _))
				try {
					if (
						((f = 1),
						y &&
							(t =
								op[0] & 2
									? y["return"]
									: op[0]
										? y["throw"] || ((t = y["return"]) && t.call(y), 0)
										: y.next) &&
							!(t = t.call(y, op[1])).done)
					)
						return t;
					if (((y = 0), t)) op = [op[0] & 2, t.value];
					switch (op[0]) {
						case 0:
						case 1:
							t = op;
							break;
						case 4:
							_.label++;
							return { value: op[1], done: false };
						case 5:
							_.label++;
							y = op[1];
							op = [0];
							continue;
						case 7:
							op = _.ops.pop();
							_.trys.pop();
							continue;
						default:
							if (
								!((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
								(op[0] === 6 || op[0] === 2)
							) {
								_ = 0;
								continue;
							}
							if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
								_.label = op[1];
								break;
							}
							if (op[0] === 6 && _.label < t[1]) {
								_.label = t[1];
								t = op;
								break;
							}
							if (t && _.label < t[2]) {
								_.label = t[2];
								_.ops.push(op);
								break;
							}
							if (t[2]) _.ops.pop();
							_.trys.pop();
							continue;
					}
					op = body.call(thisArg, _);
				} catch (e) {
					op = [6, e];
					y = 0;
				} finally {
					f = t = 0;
				}
			if (op[0] & 5) throw op[1];
			return { value: op[0] ? op[1] : void 0, done: true };
		}
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailgunMailer = void 0;
// @ts-nocheck
var core_1 = require("../core");
var mail_client_1 = require("@common/mail-client");
var mailgun_js_1 = __importDefault(require("mailgun.js"));
var MailgunMailer = /** @class */ (function () {
	function MailgunMailer(cfg) {
		this.cfg = cfg;
		var mailgun = new mailgun_js_1.default(FormData);
		this.client = mailgun.client({
			username: "api",
			key: cfg.mailgunApiKey,
			url:
				cfg.region === "eu"
					? "https://api.eu.mailgun.net"
					: "https://api.mailgun.net",
		});
	}
	MailgunMailer.from = function (raw) {
		var cfg = core_1.RawMailgunConfigSchema.parse(raw);
		return new MailgunMailer(cfg);
	};
	MailgunMailer.prototype.verify = function () {
		return __awaiter(this, void 0, void 0, function () {
			var err_1;
			var _a;
			return __generator(this, function (_b) {
				switch (_b.label) {
					case 0:
						_b.trys.push([0, 2, , 3]);
						return [4 /*yield*/, this.client.domains.list()];
					case 1:
						_b.sent();
						return [
							2 /*return*/,
							{
								ok: true,
								message: "OK",
								meta: { provider: "sendgrid", send: true },
							},
						];
					case 2:
						err_1 = _b.sent();
						return [
							2 /*return*/,
							{
								ok: false,
								message:
									(_a =
										err_1 === null || err_1 === void 0
											? void 0
											: err_1.message) !== null && _a !== void 0
										? _a
										: "Mailgun verify failed",
								meta: {
									status:
										err_1 === null || err_1 === void 0 ? void 0 : err_1.status,
									details:
										err_1 === null || err_1 === void 0 ? void 0 : err_1.details,
								},
							},
						];
					case 3:
						return [2 /*return*/];
				}
			});
		});
	};
	MailgunMailer.prototype.sendTestEmail = function (to, opts) {
		return __awaiter(this, void 0, void 0, function () {
			var domain, err_2;
			var _a, _b, _c;
			return __generator(this, function (_d) {
				switch (_d.label) {
					case 0:
						_d.trys.push([0, 2, , 3]);
						domain = opts.from.split("@")[1];
						return [
							4 /*yield*/,
							this.client.messages.create(domain, {
								from:
									(_a =
										opts === null || opts === void 0 ? void 0 : opts.from) !==
										null && _a !== void 0
										? _a
										: "no-reply@kurrier.org",
								to: to,
								subject:
									(_b =
										opts === null || opts === void 0
											? void 0
											: opts.subject) !== null && _b !== void 0
										? _b
										: "Test email",
								text:
									(_c =
										opts === null || opts === void 0 ? void 0 : opts.body) !==
										null && _c !== void 0
										? _c
										: "This is a test email from your configured Mailgun provider.",
							}),
						];
					case 1:
						_d.sent();
						return [2 /*return*/, true];
					case 2:
						err_2 = _d.sent();
						return [2 /*return*/, false];
					case 3:
						return [2 /*return*/];
				}
			});
		});
	};
	// Mailgun: add a domain and return DNS to set
	MailgunMailer.prototype.addDomain = function (domain_1) {
		return __awaiter(this, arguments, void 0, function (domain, opts) {
			var d, res, dns, _i, _a, rec, _b, _c, rec, state, status_1, err_3;
			var _d, _e, _f, _g, _h, _j, _k;
			if (opts === void 0) {
				opts = {};
			}
			return __generator(this, function (_l) {
				switch (_l.label) {
					case 0:
						d = this.normalizeDomain(domain);
						_l.label = 1;
					case 1:
						_l.trys.push([1, 3, , 4]);
						return [
							4 /*yield*/,
							this.client.domains.create({
								name: d,
								spam_action: "tag",
							}),
						];
					case 2:
						res = _l.sent();
						dns = [];
						for (
							_i = 0,
								_a =
									(_d = res.sending_dns_records) !== null && _d !== void 0
										? _d
										: [];
							_i < _a.length;
							_i++
						) {
							rec = _a[_i];
							dns.push({
								type: String(rec.record_type || "").toUpperCase(), // TXT / CNAME
								name: rec.name,
								value: rec.value,
								note: "sending (".concat(rec.valid ? "valid" : "pending", ")"),
							});
						}
						for (
							_b = 0,
								_c =
									(_e = res.receiving_dns_records) !== null && _e !== void 0
										? _e
										: [];
							_b < _c.length;
							_b++
						) {
							rec = _c[_b];
							dns.push({
								type: String(rec.record_type || "").toUpperCase(), // MX
								name: rec.name,
								value: rec.value,
								priority: rec.priority,
								note: "receiving (".concat(
									rec.valid ? "valid" : "pending",
									")",
								),
							});
						}
						state =
							(_g =
								(_f = res.domain) === null || _f === void 0
									? void 0
									: _f.state) !== null && _g !== void 0
								? _g
								: "unverified";
						status_1 = state === "active" ? "verified" : "unverified";
						return [
							2 /*return*/,
							{
								domain:
									(_j =
										(_h = res.domain) === null || _h === void 0
											? void 0
											: _h.name) !== null && _j !== void 0
										? _j
										: d, // e.g. "mg.kurrier.org"
								status: status_1,
								dns: dns,
								meta: {
									mailgun_raw: JSON.parse(JSON.stringify(res)),
								},
							},
						];
					case 3:
						err_3 = _l.sent();
						return [
							2 /*return*/,
							{
								domain: d,
								status: "failed",
								dns: [],
								meta: {
									error:
										(_k =
											err_3 === null || err_3 === void 0
												? void 0
												: err_3.message) !== null && _k !== void 0
											? _k
											: String(err_3),
								},
							},
						];
					case 4:
						return [2 /*return*/];
				}
			});
		});
	};
	MailgunMailer.prototype.normalizeDomain = function (d) {
		return d.trim().replace(/\.$/, "").toLowerCase();
	};
	MailgunMailer.prototype.removeDomain = function (domain) {
		return __awaiter(this, void 0, void 0, function () {
			var listRes, all, parse, e_1, listRes, all, dom, e_2;
			var _this = this;
			var _a, _b;
			return __generator(this, function (_c) {
				switch (_c.label) {
					case 0:
						_c.trys.push([0, 4, , 5]);
						return [
							4 /*yield*/,
							this.client.request({
								method: "GET",
								url: "/v3/user/webhooks/parse/settings",
							}),
						];
					case 1:
						listRes = _c.sent()[0];
						all =
							(_a = listRes.body.result) !== null && _a !== void 0 ? _a : [];
						parse = all.find(function (s) {
							var _a;
							return (
								((_a = s.hostname) === null || _a === void 0
									? void 0
									: _a.toLowerCase()) === domain.toLowerCase()
							);
						});
						if (!parse) return [3 /*break*/, 3];
						return [
							4 /*yield*/,
							this.client.request({
								method: "DELETE",
								url: "/v3/user/webhooks/parse/settings/".concat(parse.id),
							}),
						];
					case 2:
						_c.sent();
						_c.label = 3;
					case 3:
						return [3 /*break*/, 5];
					case 4:
						e_1 = _c.sent();
						console.warn("removeDomain: inbound parse delete error", e_1);
						return [3 /*break*/, 5];
					case 5:
						_c.trys.push([5, 9, , 10]);
						return [
							4 /*yield*/,
							this.client.request({
								method: "GET",
								url: "/v3/whitelabel/domains",
							}),
						];
					case 6:
						listRes = _c.sent()[0];
						all = (_b = listRes.body) !== null && _b !== void 0 ? _b : [];
						dom = all.find(function (x) {
							return _this.normalizeDomain(x.domain) === domain;
						});
						if (!dom) return [3 /*break*/, 8];
						return [
							4 /*yield*/,
							this.client.request({
								method: "DELETE",
								url: "/v3/whitelabel/domains/".concat(dom.id),
							}),
						];
					case 7:
						_c.sent();
						_c.label = 8;
					case 8:
						return [3 /*break*/, 10];
					case 9:
						e_2 = _c.sent();
						console.warn("removeDomain: domain delete error", e_2);
						return [3 /*break*/, 10];
					case 10:
						return [
							2 /*return*/,
							{
								domain: domain,
								status: "unverified", // since it’s gone, treat as unverified
								dns: [],
								meta: { deleted: true },
							},
						];
				}
			});
		});
	};
	MailgunMailer.prototype.verifyDomain = function (domain_1) {
		return __awaiter(this, arguments, void 0, function (domain, opts) {
			var d,
				webHookUrl,
				res,
				dns,
				_i,
				_a,
				rec,
				_b,
				_c,
				rec,
				isActive,
				status_2,
				e_3;
			var _d, _e, _f, _g, _h;
			if (opts === void 0) {
				opts = {};
			}
			return __generator(this, function (_j) {
				switch (_j.label) {
					case 0:
						d = this.normalizeDomain(domain);
						webHookUrl =
							opts === null || opts === void 0 ? void 0 : opts.webHookUrl;
						_j.label = 1;
					case 1:
						_j.trys.push([1, 5, , 6]);
						return [4 /*yield*/, this.client.domains.verify(d)];
					case 2:
						res = _j.sent();
						dns = [];
						for (
							_i = 0,
								_a =
									(_d = res.sending_dns_records) !== null && _d !== void 0
										? _d
										: [];
							_i < _a.length;
							_i++
						) {
							rec = _a[_i];
							dns.push({
								type: String(rec.record_type || "").toUpperCase(),
								name: rec.name,
								value: rec.value,
								note: "sending (".concat(rec.valid ? "valid" : "pending", ")"),
							});
						}
						for (
							_b = 0,
								_c =
									(_e = res.receiving_dns_records) !== null && _e !== void 0
										? _e
										: [];
							_b < _c.length;
							_b++
						) {
							rec = _c[_b];
							dns.push({
								type: String(rec.record_type || "").toUpperCase(),
								name: rec.name,
								value: rec.value,
								priority: rec.priority,
								note: "receiving (".concat(
									rec.valid ? "valid" : "pending",
									")",
								),
							});
						}
						isActive = res.state === "active";
						status_2 = isActive ? "verified" : "unverified";
						if (!(isActive && webHookUrl)) return [3 /*break*/, 4];
						return [4 /*yield*/, this.upsertInboundRoute(d, webHookUrl)];
					case 3:
						_j.sent();
						_j.label = 4;
					case 4:
						return [
							2 /*return*/,
							{
								domain:
									(_g =
										(_f = res.domain) === null || _f === void 0
											? void 0
											: _f.name) !== null && _g !== void 0
										? _g
										: d,
								status: status_2,
								dns: dns,
								meta: { mailgun_raw: JSON.parse(JSON.stringify(res)) },
							},
						];
					case 5:
						e_3 = _j.sent();
						return [
							2 /*return*/,
							{
								domain: d,
								status: "failed",
								dns: [],
								meta: {
									error:
										(_h =
											e_3 === null || e_3 === void 0 ? void 0 : e_3.message) !==
											null && _h !== void 0
											? _h
											: String(e_3),
								},
							},
						];
					case 6:
						return [2 /*return*/];
				}
			});
		});
	};
	MailgunMailer.prototype.upsertInboundRoute = function (domain, webhookUrl) {
		return __awaiter(this, void 0, void 0, function () {
			var expr, list, all, _i, all_1, r, created, e_4;
			var _a;
			return __generator(this, function (_b) {
				switch (_b.label) {
					case 0:
						expr = 'match_recipient(".*@'.concat(domain, '")');
						_b.label = 1;
					case 1:
						_b.trys.push([1, 8, , 9]);
						return [4 /*yield*/, this.client.routes.list()];
					case 2:
						list = _b.sent();
						all = list !== null && list !== void 0 ? list : [];
						(_i = 0), (all_1 = all);
						_b.label = 3;
					case 3:
						if (!(_i < all_1.length)) return [3 /*break*/, 6];
						r = all_1[_i];
						return [4 /*yield*/, this.client.routes.destroy(r.id)];
					case 4:
						_b.sent();
						console.log(
							"Deleted old route ".concat(r.id, " for ").concat(domain),
						);
						_b.label = 5;
					case 5:
						_i++;
						return [3 /*break*/, 3];
					case 6:
						return [
							4 /*yield*/,
							this.client.routes.create({
								priority: "1",
								description: "Catch-all for ".concat(domain),
								expression: expr,
								action: ['forward("'.concat(webhookUrl, '")'), "stop()"],
							}),
						];
					case 7:
						created = _b.sent();
						return [2 /*return*/, { id: created.id, created: true }];
					case 8:
						e_4 = _b.sent();
						console.error(
							"upsertInboundRoute error",
							(_a = e_4 === null || e_4 === void 0 ? void 0 : e_4.message) !==
								null && _a !== void 0
								? _a
								: e_4,
						);
						throw e_4;
					case 9:
						return [2 /*return*/];
				}
			});
		});
	};
	MailgunMailer.prototype.addEmail = function () {
		return __awaiter(this, void 0, void 0, function () {
			return __generator(this, function (_a) {
				return [2 /*return*/, {}];
			});
		});
	};
	MailgunMailer.prototype.removeDomain = function (domain) {
		return __awaiter(this, void 0, void 0, function () {
			var routes, all, _i, all_2, r, e_5, e_6;
			var _a;
			return __generator(this, function (_b) {
				switch (_b.label) {
					case 0:
						_b.trys.push([0, 6, , 7]);
						return [4 /*yield*/, this.client.routes.list()];
					case 1:
						routes = _b.sent();
						all = routes !== null && routes !== void 0 ? routes : [];
						(_i = 0), (all_2 = all);
						_b.label = 2;
					case 2:
						if (!(_i < all_2.length)) return [3 /*break*/, 5];
						r = all_2[_i];
						if (
							!((_a = r.expression) === null || _a === void 0
								? void 0
								: _a.includes(domain))
						)
							return [3 /*break*/, 4];
						return [4 /*yield*/, this.client.routes.destroy(r.id)];
					case 3:
						_b.sent();
						console.log(
							"Deleted route ".concat(r.id, " for domain ").concat(domain),
						);
						_b.label = 4;
					case 4:
						_i++;
						return [3 /*break*/, 2];
					case 5:
						return [3 /*break*/, 7];
					case 6:
						e_5 = _b.sent();
						console.warn("removeDomain: inbound routes delete error", e_5);
						return [3 /*break*/, 7];
					case 7:
						_b.trys.push([7, 9, , 10]);
						return [4 /*yield*/, this.client.domains.destroy(domain)];
					case 8:
						_b.sent();
						console.log("Deleted Mailgun domain ".concat(domain));
						return [3 /*break*/, 10];
					case 9:
						e_6 = _b.sent();
						console.warn("removeDomain: domain delete error", e_6);
						return [3 /*break*/, 10];
					case 10:
						return [
							2 /*return*/,
							{
								domain: domain,
								status: "unverified",
								dns: [],
								meta: { deleted: true },
							},
						];
				}
			});
		});
	};
	MailgunMailer.prototype.removeEmail = function () {
		return __awaiter(this, void 0, void 0, function () {
			return __generator(this, function (_a) {
				return [2 /*return*/, {}];
			});
		});
	};
	MailgunMailer.prototype.sendEmail = function (to, opts) {
		return __awaiter(this, void 0, void 0, function () {
			var domain, mgAttachments, _a, headers, payload, res, id, err_4;
			var _this = this;
			var _b;
			return __generator(this, function (_c) {
				switch (_c.label) {
					case 0:
						_c.trys.push([0, 5, , 6]);
						domain = String(opts.from.split("@")[1] || "").trim();
						if (!(opts.attachments && opts.attachments.length))
							return [3 /*break*/, 2];
						return [
							4 /*yield*/,
							Promise.all(
								opts.attachments.map(function (a) {
									return __awaiter(_this, void 0, void 0, function () {
										var _a, _b;
										var _c;
										return __generator(this, function (_d) {
											switch (_d.label) {
												case 0:
													_c = {
														filename: (0, mail_client_1.sanitizeFilename)(
															a.name,
														),
													};
													_b = (_a = Buffer).from;
													return [4 /*yield*/, a.content.arrayBuffer()];
												case 1:
													return [
														2 /*return*/,
														((_c.data = _b.apply(_a, [_d.sent()])),
														(_c.contentType =
															a.contentType || "application/octet-stream"),
														_c),
													];
											}
										});
									});
								}),
							),
						];
					case 1:
						_a = _c.sent();
						return [3 /*break*/, 3];
					case 2:
						_a = undefined;
						_c.label = 3;
					case 3:
						mgAttachments = _a;
						headers = {};
						if (opts.inReplyTo) headers["h:In-Reply-To"] = opts.inReplyTo;
						if (
							(_b = opts.references) === null || _b === void 0
								? void 0
								: _b.length
						)
							headers["h:References"] = opts.references.join(" ");
						payload = __assign(
							{
								from: opts.from,
								to: to,
								subject: opts.subject,
								text: opts.text || undefined,
								html: opts.html || undefined,
							},
							headers,
						);
						if (mgAttachments) {
							payload.attachment = mgAttachments; // one or many
						}
						return [4 /*yield*/, this.client.messages.create(domain, payload)];
					case 4:
						res = _c.sent();
						id =
							typeof (res === null || res === void 0 ? void 0 : res.id) ===
							"string"
								? res.id.replace(/^<|>$/g, "")
								: undefined;
						return [2 /*return*/, { success: true, MessageId: id }];
					case 5:
						err_4 = _c.sent();
						console.error("mailgun sendEmail error", err_4);
						return [2 /*return*/, { success: false }];
					case 6:
						return [2 /*return*/];
				}
			});
		});
	};
	return MailgunMailer;
})();
exports.MailgunMailer = MailgunMailer;
