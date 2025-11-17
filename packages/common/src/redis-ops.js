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
exports.kvSet = kvSet;
exports.kvGet = kvGet;
exports.kvDel = kvDel;
exports.initRedis = initRedis;
var ioredis_1 = __importDefault(require("ioredis"));
var _schema_1 = require("@schema");
var serverConfig = (0, _schema_1.getServerEnv)();
var redis = new ioredis_1.default({
    maxRetriesPerRequest: null,
    password: serverConfig.REDIS_PASSWORD,
    host: serverConfig.REDIS_HOST || "redis",
    port: Number(serverConfig.REDIS_PORT || 6379),
});
var redisConnection = {
    connection: {
        host: serverConfig.REDIS_HOST || "redis",
        port: Number(serverConfig.REDIS_PORT || 6379),
        password: serverConfig.REDIS_PASSWORD,
    },
};
var PREFIX = "kurrier:";
function kvSet(key, value, ttlSec) {
    return __awaiter(this, void 0, void 0, function () {
        var v;
        return __generator(this, function (_a) {
            v = typeof value === "string" ? value : JSON.stringify(value);
            return [2 /*return*/, ttlSec
                    ? redis.set(PREFIX + key, v, "EX", ttlSec)
                    : redis.set(PREFIX + key, v)];
        });
    });
}
function kvGet(key) {
    return __awaiter(this, void 0, void 0, function () {
        var raw;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, redis.get(PREFIX + key)];
                case 1:
                    raw = _a.sent();
                    if (raw == null)
                        return [2 /*return*/, null];
                    try {
                        return [2 /*return*/, JSON.parse(raw)];
                    }
                    catch (_b) {
                        return [2 /*return*/, raw];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function kvDel(key) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, redis.del(PREFIX + key)];
        });
    });
}
function initRedis() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, {
                    connection: redisConnection,
                    redis: redis,
                }];
        });
    });
}
