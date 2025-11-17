"use strict";
// "use server";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSecrets = listSecrets;
exports.createSecret = createSecret;
exports.getSecretAdmin = getSecretAdmin;
exports.getSecret = getSecret;
exports.updateSecret = updateSecret;
exports.deleteSecret = deleteSecret;
var drizzle_orm_1 = require("drizzle-orm");
var drizzle_client_1 = require("./drizzle-client");
var schema_1 = require("./schema");
var init_db_1 = require("./init-db");
function vaultCreateSecret(tx, opts) {
	return __awaiter(this, void 0, void 0, function () {
		var name, secret, rows, id;
		var _a;
		return __generator(this, function (_b) {
			switch (_b.label) {
				case 0:
					(name = opts.name), (secret = opts.secret);
					return [
						4 /*yield*/,
						tx.execute(
							(0, drizzle_orm_1.sql)(
								templateObject_1 ||
									(templateObject_1 = __makeTemplateObject(
										["select vault.create_secret(", ", ", ") as id"],
										["select vault.create_secret(", ", ", ") as id"],
									)),
								secret,
								name,
							),
						),
					];
				case 1:
					rows = _b.sent();
					id = (_a = rows[0]) === null || _a === void 0 ? void 0 : _a.id;
					if (!id) throw new Error("vault.create_secret did not return an id");
					return [2 /*return*/, id];
			}
		});
	});
}
function vaultUpdateSecret(tx, id, secret) {
	return __awaiter(this, void 0, void 0, function () {
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					return [
						4 /*yield*/,
						tx.execute(
							(0, drizzle_orm_1.sql)(
								templateObject_2 ||
									(templateObject_2 = __makeTemplateObject(
										["select vault.update_secret(", ", ", ")"],
										["select vault.update_secret(", ", ", ")"],
									)),
								id,
								secret,
							),
						),
					];
				case 1:
					_a.sent();
					return [2 /*return*/];
			}
		});
	});
}
function vaultDeleteSecret(tx, id) {
	return __awaiter(this, void 0, void 0, function () {
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					return [
						4 /*yield*/,
						tx.execute(
							(0, drizzle_orm_1.sql)(
								templateObject_3 ||
									(templateObject_3 = __makeTemplateObject(
										["select vault.delete_secret(", ")"],
										["select vault.delete_secret(", ")"],
									)),
								id,
							),
						),
					];
				case 1:
					_a.sent();
					return [2 /*return*/];
			}
		});
	});
}
function vaultGetSecret(tx, id) {
	return __awaiter(this, void 0, void 0, function () {
		var row;
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					return [
						4 /*yield*/,
						tx.execute(
							(0, drizzle_orm_1.sql)(
								templateObject_4 ||
									(templateObject_4 = __makeTemplateObject(
										[
											"select id, name, description, decrypted_secret\n        from vault.decrypted_secrets\n        where id = ",
											"\n        limit 1",
										],
										[
											"select id, name, description, decrypted_secret\n        from vault.decrypted_secrets\n        where id = ",
											"\n        limit 1",
										],
									)),
								id,
							),
						),
					];
				case 1:
					row = _a.sent()[0];
					return [2 /*return*/, row !== null && row !== void 0 ? row : null];
			}
		});
	});
}
function listSecrets(session) {
	return __awaiter(this, void 0, void 0, function () {
		var db;
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					return [
						4 /*yield*/,
						(0, drizzle_client_1.createDrizzleSupabaseClient)(session),
					];
				case 1:
					db = _a.sent();
					return [
						2 /*return*/,
						db.rls(function (tx) {
							return tx.select().from(schema_1.secretsMeta);
						}),
					];
			}
		});
	});
}
function createSecret(session, input) {
	return __awaiter(this, void 0, void 0, function () {
		var db, admin, rls, vaultId, rows;
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					return [
						4 /*yield*/,
						(0, drizzle_client_1.createDrizzleSupabaseClient)(session),
					];
				case 1:
					db = _a.sent();
					(admin = db.admin), (rls = db.rls);
					return [
						4 /*yield*/,
						admin.transaction(function (tx) {
							return vaultCreateSecret(tx, {
								name: input.name,
								secret: input.value,
							});
						}),
					];
				case 2:
					vaultId = _a.sent();
					return [
						4 /*yield*/,
						rls(function (tx) {
							return tx
								.insert(schema_1.secretsMeta)
								.values({
									name: input.name,
									vaultSecret: vaultId,
									// If your column has default auth.uid(), you do NOT need to set owner_id explicitly.
									// owner_id will be checked by your RLS policy (withCheck owner_id = auth.uid()).
								})
								.returning();
						}),
					];
				case 3:
					rows = _a.sent();
					return [2 /*return*/, rows[0]];
			}
		});
	});
}
function getSecretAdmin(id) {
	return __awaiter(this, void 0, void 0, function () {
		var db, meta, vault;
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					db = (0, init_db_1.createDb)();
					return [
						4 /*yield*/,
						db
							.select()
							.from(schema_1.secretsMeta)
							.where((0, drizzle_orm_1.eq)(schema_1.secretsMeta.id, id))
							.limit(1)
							.then(function (r) {
								return r[0];
							}),
					];
				case 1:
					meta = _a.sent();
					if (!meta) throw new Error("Secret metadata not found");
					return [
						4 /*yield*/,
						db.transaction(function (tx) {
							return vaultGetSecret(tx, meta.vaultSecret);
						}),
					];
				case 2:
					vault = _a.sent();
					return [2 /*return*/, { metaSecret: meta, vault: vault }];
			}
		});
	});
}
function getSecret(session, id) {
	return __awaiter(this, void 0, void 0, function () {
		var db, admin, rls, meta, vault;
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					return [
						4 /*yield*/,
						(0, drizzle_client_1.createDrizzleSupabaseClient)(session),
					];
				case 1:
					db = _a.sent();
					(admin = db.admin), (rls = db.rls);
					return [
						4 /*yield*/,
						rls(function (tx) {
							return tx
								.select()
								.from(schema_1.secretsMeta)
								.where((0, drizzle_orm_1.eq)(schema_1.secretsMeta.id, id))
								.limit(1);
						}).then(function (r) {
							return r[0];
						}),
					];
				case 2:
					meta = _a.sent();
					if (!meta) throw new Error("Not found or not allowed");
					return [
						4 /*yield*/,
						admin.transaction(function (tx) {
							return vaultGetSecret(tx, meta.vaultSecret);
						}),
					];
				case 3:
					vault = _a.sent();
					return [2 /*return*/, { metaSecret: meta, vault: vault }];
			}
		});
	});
}
function updateSecret(session, id, input) {
	return __awaiter(this, void 0, void 0, function () {
		var db, admin, rls, meta, rows;
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					return [
						4 /*yield*/,
						(0, drizzle_client_1.createDrizzleSupabaseClient)(session),
					];
				case 1:
					db = _a.sent();
					(admin = db.admin), (rls = db.rls);
					return [
						4 /*yield*/,
						rls(function (tx) {
							return tx
								.select()
								.from(schema_1.secretsMeta)
								.where((0, drizzle_orm_1.eq)(schema_1.secretsMeta.id, id))
								.limit(1);
						}).then(function (r) {
							return r[0];
						}),
					];
				case 2:
					meta = _a.sent();
					if (!meta) throw new Error("Not found or not allowed");
					if (!(input.value !== undefined)) return [3 /*break*/, 4];
					return [
						4 /*yield*/,
						admin.transaction(function (tx) {
							return vaultUpdateSecret(tx, meta.vaultSecret, input.value);
						}),
					];
				case 3:
					_a.sent();
					_a.label = 4;
				case 4:
					if (!(input.name !== undefined)) return [3 /*break*/, 6];
					return [
						4 /*yield*/,
						rls(function (tx) {
							return tx
								.update(schema_1.secretsMeta)
								.set(
									__assign(
										{},
										input.name !== undefined ? { name: input.name } : {},
									),
								)
								.where((0, drizzle_orm_1.eq)(schema_1.secretsMeta.id, id))
								.returning();
						}),
					];
				case 5:
					rows = _a.sent();
					return [2 /*return*/, rows[0]];
				case 6:
					return [2 /*return*/, meta];
			}
		});
	});
}
function deleteSecret(session, id) {
	return __awaiter(this, void 0, void 0, function () {
		var db, admin, rls, meta;
		return __generator(this, function (_a) {
			switch (_a.label) {
				case 0:
					return [
						4 /*yield*/,
						(0, drizzle_client_1.createDrizzleSupabaseClient)(session),
					];
				case 1:
					db = _a.sent();
					(admin = db.admin), (rls = db.rls);
					return [
						4 /*yield*/,
						rls(function (tx) {
							return tx
								.select()
								.from(schema_1.secretsMeta)
								.where((0, drizzle_orm_1.eq)(schema_1.secretsMeta.id, id))
								.limit(1);
						}).then(function (r) {
							return r[0];
						}),
					];
				case 2:
					meta = _a.sent();
					if (!meta) return [2 /*return*/];
					return [
						4 /*yield*/,
						admin.transaction(function (tx) {
							return vaultDeleteSecret(tx, meta.vaultSecret);
						}),
					];
				case 3:
					_a.sent();
					return [
						4 /*yield*/,
						rls(function (tx) {
							return tx
								.delete(schema_1.secretsMeta)
								.where((0, drizzle_orm_1.eq)(schema_1.secretsMeta.id, id));
						}),
					];
				case 4:
					_a.sent();
					return [2 /*return*/];
			}
		});
	});
}
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
