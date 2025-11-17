"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db_rls = exports.db = exports.createDbRls = exports.createDb = void 0;
var postgres_js_1 = require("drizzle-orm/postgres-js");
var postgres_1 = __importDefault(require("postgres"));
var _schema_1 = require("@schema");
var createDb = function () {
    var DATABASE_URL = (0, _schema_1.getServerEnv)().DATABASE_URL;
    if (!global._db) {
        var client = (0, postgres_1.default)(String(DATABASE_URL), { prepare: false });
        global._db = (0, postgres_js_1.drizzle)(client);
    }
    return global._db;
};
exports.createDb = createDb;
var createDbRls = function () {
    var DATABASE_RLS_URL = (0, _schema_1.getServerEnv)().DATABASE_RLS_URL;
    if (!global._db_rls) {
        var client = (0, postgres_1.default)(String(DATABASE_RLS_URL), { prepare: false });
        global._db_rls = (0, postgres_js_1.drizzle)(client);
    }
    return global._db_rls;
};
exports.createDbRls = createDbRls;
exports.db = (0, exports.createDb)();
exports.db_rls = (0, exports.createDbRls)();
