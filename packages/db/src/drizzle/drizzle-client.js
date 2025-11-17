"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = decode;
exports.createDrizzle = createDrizzle;
exports.createDrizzleSupabaseClient = createDrizzleSupabaseClient;
var drizzle_orm_1 = require("drizzle-orm");
var jwt_decode_1 = require("jwt-decode");
var init_db_1 = require("./init-db");
function decode(accessToken) {
    try {
        return (0, jwt_decode_1.jwtDecode)(accessToken);
    }
    catch (error) {
        return { role: "anon" };
    }
}
function createDrizzle(token, _a) {
    var _this = this;
    var admin = _a.admin, client = _a.client;
    return {
        admin: admin,
        rls: (function (transaction) {
            var rest = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                rest[_i - 1] = arguments[_i];
            }
            return __awaiter(_this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    return [2 /*return*/, client.transaction.apply(client, __spreadArray([function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                var _a, _b;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0: 
                                        // 1) set JWT claims/local role – use parameters, not raw
                                        return [4 /*yield*/, tx.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["select set_config('request.jwt.claims', ", ", true)"], ["select set_config('request.jwt.claims', ", ", true)"])), JSON.stringify(token)))];
                                        case 1:
                                            // 1) set JWT claims/local role – use parameters, not raw
                                            _c.sent();
                                            return [4 /*yield*/, tx.execute((0, drizzle_orm_1.sql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["select set_config('request.jwt.claim.sub', ", ", true)"], ["select set_config('request.jwt.claim.sub', ", ", true)"])), (_a = token.sub) !== null && _a !== void 0 ? _a : ""))];
                                        case 2:
                                            _c.sent();
                                            // role must be an identifier; keep raw, but only for the role name
                                            return [4 /*yield*/, tx.execute((0, drizzle_orm_1.sql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["set local role ", ""], ["set local role ", ""])), drizzle_orm_1.sql.raw((_b = token.role) !== null && _b !== void 0 ? _b : "anon")))];
                                        case 3:
                                            // role must be an identifier; keep raw, but only for the role name
                                            _c.sent();
                                            // 2) run caller work
                                            return [2 /*return*/, transaction(tx)];
                                    }
                                });
                            }); }], rest, false))];
                });
            });
        }),
    };
}
function createDrizzleSupabaseClient(session) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            return [2 /*return*/, createDrizzle(decode((_a = session === null || session === void 0 ? void 0 : session.access_token) !== null && _a !== void 0 ? _a : ""), {
                    admin: init_db_1.db,
                    client: init_db_1.db_rls,
                })];
        });
    });
}
var templateObject_1, templateObject_2, templateObject_3;
