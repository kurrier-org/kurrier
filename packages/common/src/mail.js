"use strict";
var __makeTemplateObject =
	(this && this.__makeTemplateObject) ||
	function (cooked, raw) {
		if (Object.defineProperty) {
			Object.defineProperty(cooked, "raw", { value: raw });
		} else {
			cooked.raw = raw;
		}
		return cooked;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSnippet = void 0;
exports.buildParticipantsSnapshot = buildParticipantsSnapshot;
exports.upsertMailboxThreadItem = upsertMailboxThreadItem;
exports.base64ToUint8Array = base64ToUint8Array;
exports.base64ToBlob = base64ToBlob;
// @ts-nocheck
var _db_1 = require("@db");
var drizzle_orm_1 = require("drizzle-orm");
var generateSnippet = function (text) {
	return text ? text.toString().replace(/\s+/g, " ").slice(0, 100) : null;
};
exports.generateSnippet = generateSnippet;
function buildParticipantsSnapshot(msg) {
	var extract = function (addrObj) {
		var _a;
		return (
			(_a = addrObj === null || addrObj === void 0 ? void 0 : addrObj.value) !==
				null && _a !== void 0
				? _a
				: []
		)
			.map(function (a) {
				return {
					n: (a === null || a === void 0 ? void 0 : a.name) || null,
					e: (a === null || a === void 0 ? void 0 : a.address) || null,
				};
			})
			.filter(function (x) {
				return x.e;
			})
			.slice(0, 5);
	};
	return {
		from: extract(msg.from),
		to: extract(msg.to),
		cc: extract(msg.cc),
		bcc: extract(msg.bcc),
	};
}
/**
 * Upsert (thread_id, mailbox_id) summary into mailbox_threads.
 * Aggregation is **scoped to this mailbox** so Inbox and Sent can each
 * have their own row linked to the same thread_id.
 */
function upsertMailboxThreadItem(messageId, tx) {
	return __awaiter(this, void 0, void 0, function () {
		var dbh,
			msg,
			mbx,
			ident,
			rows,
			newest,
			oldest,
			subject,
			previewText,
			coalesceDate,
			lastActivityAt,
			firstMessageAt,
			messageCount,
			unreadCount,
			hasAttachments,
			starred,
			participants,
			seenAddr,
			_loop_1,
			_i,
			rows_1,
			r,
			state_1,
			payload;
		var _a, _b, _c;
		return __generator(this, function (_d) {
			switch (_d.label) {
				case 0:
					dbh = tx !== null && tx !== void 0 ? tx : _db_1.db;
					return [
						4 /*yield*/,
						dbh
							.select()
							.from(_db_1.messages)
							.where((0, drizzle_orm_1.eq)(_db_1.messages.id, messageId)),
					];
				case 1:
					msg = _d.sent()[0];
					if (!msg) throw new Error("Message ".concat(messageId, " not found"));
					return [
						4 /*yield*/,
						dbh
							.select()
							.from(_db_1.mailboxes)
							.where((0, drizzle_orm_1.eq)(_db_1.mailboxes.id, msg.mailboxId)),
					];
				case 2:
					mbx = _d.sent()[0];
					if (!mbx)
						throw new Error("Mailbox ".concat(msg.mailboxId, " not found"));
					return [
						4 /*yield*/,
						dbh
							.select()
							.from(_db_1.identities)
							.where(
								(0, drizzle_orm_1.eq)(_db_1.identities.id, mbx.identityId),
							),
					];
				case 3:
					ident = _d.sent()[0];
					if (!ident)
						throw new Error("Identity ".concat(mbx.identityId, " not found"));
					return [
						4 /*yield*/,
						dbh
							.select({
								id: _db_1.messages.id,
								subject: _db_1.messages.subject,
								text: _db_1.messages.text,
								html: _db_1.messages.html,
								snippet: _db_1.messages.snippet,
								seen: _db_1.messages.seen,
								answered: _db_1.messages.answered,
								flagged: _db_1.messages.flagged,
								hasAttachments: _db_1.messages.hasAttachments,
								from: _db_1.messages.from,
								to: _db_1.messages.to,
								cc: _db_1.messages.cc,
								bcc: _db_1.messages.bcc,
								date: _db_1.messages.date,
								createdAt: _db_1.messages.createdAt,
							})
							.from(_db_1.messages)
							.where(
								(0, drizzle_orm_1.and)(
									(0, drizzle_orm_1.eq)(_db_1.messages.ownerId, msg.ownerId),
									(0, drizzle_orm_1.eq)(_db_1.messages.threadId, msg.threadId),
									(0, drizzle_orm_1.eq)(_db_1.messages.mailboxId, mbx.id),
								),
							)
							.orderBy(
								(0, drizzle_orm_1.desc)(
									(0, drizzle_orm_1.sql)(
										templateObject_1 ||
											(templateObject_1 = __makeTemplateObject(
												["coalesce(", ", ", ")"],
												["coalesce(", ", ", ")"],
											)),
										_db_1.messages.date,
										_db_1.messages.createdAt,
									),
								),
							),
					];
				case 4:
					rows = _d.sent();
					// There should be at least the triggering message
					if (rows.length === 0) {
						// Defensive: if nothing found (race?), create a degenerate row based on the single msg
						rows.push({
							id: msg.id,
							subject: msg.subject,
							text: msg.text,
							html: msg.html,
							snippet: msg.snippet,
							seen: msg.seen,
							answered: msg.answered,
							flagged: msg.flagged,
							hasAttachments: msg.hasAttachments,
							from: msg.from,
							to: msg.to,
							cc: msg.cc,
							bcc: msg.bcc,
							date: msg.date,
							createdAt: msg.createdAt,
						});
					}
					newest = rows[0];
					oldest = rows[rows.length - 1];
					subject =
						((_a = newest.subject) !== null && _a !== void 0
							? _a
							: ""
						).trim() || "(no subject)";
					previewText =
						(_c =
							(_b = newest.snippet) !== null && _b !== void 0
								? _b
								: (0, exports.generateSnippet)(
										newest.text || newest.html || "",
									)) !== null && _c !== void 0
							? _c
							: null;
					coalesceDate = function (r) {
						var _a;
						return (_a = r.date) !== null && _a !== void 0 ? _a : r.createdAt;
					};
					lastActivityAt = coalesceDate(newest);
					firstMessageAt = coalesceDate(oldest);
					messageCount = rows.length;
					unreadCount = rows.reduce(function (acc, r) {
						return acc + (r.seen ? 0 : 1);
					}, 0);
					hasAttachments = rows.some(function (r) {
						return r.hasAttachments;
					});
					starred = rows.some(function (r) {
						return r.flagged;
					});
					participants = { from: [], to: [], cc: [], bcc: [] };
					seenAddr = {
						from: new Set(),
						to: new Set(),
						cc: new Set(),
						bcc: new Set(),
					};
					_loop_1 = function (r) {
						var snap = buildParticipantsSnapshot(r);
						["from", "to", "cc", "bcc"].forEach(function (k) {
							var _a, _b;
							if (participants[k].length >= 5) return;
							for (var _i = 0, _c = snap[k]; _i < _c.length; _i++) {
								var p = _c[_i];
								var email = (p.e || "").toLowerCase();
								if (!email || seenAddr[k].has(email)) continue;
								seenAddr[k].add(email);
								participants[k].push({
									n: (_a = p.n) !== null && _a !== void 0 ? _a : null,
									e: (_b = p.e) !== null && _b !== void 0 ? _b : null,
								});
								if (participants[k].length >= 5) break;
							}
						});
						if (
							participants.from.length >= 5 &&
							participants.to.length >= 5 &&
							participants.cc.length >= 5 &&
							participants.bcc.length >= 5
						)
							return "break";
					};
					for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
						r = rows_1[_i];
						state_1 = _loop_1(r);
						if (state_1 === "break") break;
					}
					payload = {
						threadId: msg.threadId,
						mailboxId: mbx.id,
						ownerId: mbx.ownerId,
						identityId: mbx.identityId,
						identityPublicId: ident.publicId,
						mailboxSlug: mbx.slug,
						subject: subject,
						previewText: previewText,
						lastActivityAt: lastActivityAt,
						firstMessageAt: firstMessageAt,
						messageCount: messageCount,
						unreadCount: unreadCount,
						hasAttachments: hasAttachments,
						starred: starred,
						participants: participants, // JSONB
						updatedAt: new Date(),
					};
					// 5) Upsert on (thread_id, mailbox_id)
					return [
						4 /*yield*/,
						dbh
							.insert(_db_1.mailboxThreads)
							.values(payload)
							.onConflictDoUpdate({
								target: [
									_db_1.mailboxThreads.threadId,
									_db_1.mailboxThreads.mailboxId,
								],
								set: {
									// prefer new subject/preview if supplied
									subject: (0, drizzle_orm_1.sql)(
										templateObject_2 ||
											(templateObject_2 = __makeTemplateObject(
												["COALESCE(EXCLUDED.subject, ", ")"],
												["COALESCE(EXCLUDED.subject, ", ")"],
											)),
										_db_1.mailboxThreads.subject,
									),
									previewText: (0, drizzle_orm_1.sql)(
										templateObject_3 ||
											(templateObject_3 = __makeTemplateObject(
												["COALESCE(EXCLUDED.preview_text, ", ")"],
												["COALESCE(EXCLUDED.preview_text, ", ")"],
											)),
										_db_1.mailboxThreads.previewText,
									),
									// timeline
									lastActivityAt: (0, drizzle_orm_1.sql)(
										templateObject_4 ||
											(templateObject_4 = __makeTemplateObject(
												["GREATEST(EXCLUDED.last_activity_at, ", ")"],
												["GREATEST(EXCLUDED.last_activity_at, ", ")"],
											)),
										_db_1.mailboxThreads.lastActivityAt,
									),
									firstMessageAt: (0, drizzle_orm_1.sql)(
										templateObject_5 ||
											(templateObject_5 = __makeTemplateObject(
												[
													"LEAST(COALESCE(EXCLUDED.first_message_at, ",
													"), ",
													")",
												],
												[
													"LEAST(COALESCE(EXCLUDED.first_message_at, ",
													"), ",
													")",
												],
											)),
										_db_1.mailboxThreads.firstMessageAt,
										_db_1.mailboxThreads.firstMessageAt,
									),
									// counts from fresh aggregation
									messageCount: (0, drizzle_orm_1.sql)(
										templateObject_6 ||
											(templateObject_6 = __makeTemplateObject(
												["EXCLUDED.message_count"],
												["EXCLUDED.message_count"],
											)),
									),
									unreadCount: (0, drizzle_orm_1.sql)(
										templateObject_7 ||
											(templateObject_7 = __makeTemplateObject(
												["EXCLUDED.unread_count"],
												["EXCLUDED.unread_count"],
											)),
									),
									// booleans accumulate
									hasAttachments: (0, drizzle_orm_1.sql)(
										templateObject_8 ||
											(templateObject_8 = __makeTemplateObject(
												["", " OR EXCLUDED.has_attachments"],
												["", " OR EXCLUDED.has_attachments"],
											)),
										_db_1.mailboxThreads.hasAttachments,
									),
									starred: (0, drizzle_orm_1.sql)(
										templateObject_9 ||
											(templateObject_9 = __makeTemplateObject(
												["", " OR EXCLUDED.starred"],
												["", " OR EXCLUDED.starred"],
											)),
										_db_1.mailboxThreads.starred,
									),
									// shallow-merge participants (keeps existing keys, fills new)
									participants: (0, drizzle_orm_1.sql)(
										templateObject_10 ||
											(templateObject_10 = __makeTemplateObject(
												["jsonb_strip_nulls(", " || EXCLUDED.participants)"],
												["jsonb_strip_nulls(", " || EXCLUDED.participants)"],
											)),
										_db_1.mailboxThreads.participants,
									),
									// ids/slugs are stable but keep them consistent
									identityId: (0, drizzle_orm_1.sql)(
										templateObject_11 ||
											(templateObject_11 = __makeTemplateObject(
												["EXCLUDED.identity_id"],
												["EXCLUDED.identity_id"],
											)),
									),
									identityPublicId: (0, drizzle_orm_1.sql)(
										templateObject_12 ||
											(templateObject_12 = __makeTemplateObject(
												["EXCLUDED.identity_public_id"],
												["EXCLUDED.identity_public_id"],
											)),
									),
									mailboxSlug: (0, drizzle_orm_1.sql)(
										templateObject_13 ||
											(templateObject_13 = __makeTemplateObject(
												["EXCLUDED.mailbox_slug"],
												["EXCLUDED.mailbox_slug"],
											)),
									),
									updatedAt: (0, drizzle_orm_1.sql)(
										templateObject_14 ||
											(templateObject_14 = __makeTemplateObject(
												["now()"],
												["now()"],
											)),
									),
								},
							}),
					];
				case 5:
					// 5) Upsert on (thread_id, mailbox_id)
					_d.sent();
					return [2 /*return*/, { threadId: msg.threadId, mailboxId: mbx.id }];
			}
		});
	});
}
function base64ToUint8Array(base64) {
	var binary = atob(base64);
	var len = binary.length;
	var bytes = new Uint8Array(len);
	for (var i = 0; i < len; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
function base64ToBlob(base64, contentType) {
	var bytes = base64ToUint8Array(base64);
	return new Blob([bytes], { type: contentType });
}
var templateObject_1,
	templateObject_2,
	templateObject_3,
	templateObject_4,
	templateObject_5,
	templateObject_6,
	templateObject_7,
	templateObject_8,
	templateObject_9,
	templateObject_10,
	templateObject_11,
	templateObject_12,
	templateObject_13,
	templateObject_14;
