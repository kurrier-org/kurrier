"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZPublicConfig = exports.ZServerConfig = void 0;
exports.parseServerConfig = parseServerConfig;
exports.parsePublicConfig = parsePublicConfig;
exports.parseEnv = parseEnv;
exports.getServerEnv = getServerEnv;
exports.getPublicEnv = getPublicEnv;
exports.getEnv = getEnv;
var zod_1 = require("zod");
/** Common helpers */
var ZPort = zod_1.z.coerce.number().int().min(1).max(65535);
var ZNodeEnv = zod_1.z.enum(["development", "production", "test"]);
/** Server-only (never sent to the browser) */
exports.ZServerConfig = zod_1.z.object({
    WEB_PORT: ZPort.default(3000),
    NODE_ENV: ZNodeEnv.default("development"),
    DATABASE_URL: zod_1.z.string("DATABASE_URL must be a valid Postgres connection URL"),
    DATABASE_RLS_URL: zod_1.z.string("DATABASE_RLS_URL must be a valid Postgres connection URL"),
    SERVICE_ROLE_KEY: zod_1.z.string("SERVICE_ROLE_KEY must be present"),
    REDIS_PASSWORD: zod_1.z.string("REDIS_PASSWORD must be present"),
    REDIS_HOST: zod_1.z.string("REDIS_HOST must be present"),
    REDIS_PORT: zod_1.z.string("REDIS_PORT must be present"),
    TYPESENSE_API_KEY: zod_1.z.string("TYPESENSE_API_KEY must be present"),
    TYPESENSE_PORT: zod_1.z.string("TYPESENSE_PORT must be present"),
    TYPESENSE_PROTOCOL: zod_1.z.string("TYPESENSE_PROTOCOL must be present"),
    TYPESENSE_HOST: zod_1.z.string("TYPESENSE_HOST must be present"),
    SEARCH_REBUILD_ON_BOOT: zod_1.z.string("SEARCH_REBUILD_ON_BOOT must be present"),
});
/** Safe to expose to the browser */
exports.ZPublicConfig = zod_1.z.object({
    API_PUBLIC_URL: zod_1.z.string("API_PUBLIC_URL must be present"),
    API_URL: zod_1.z.string("API_URL must be present"),
    ANON_KEY: zod_1.z.string("ANON_KEY must be present"),
    WEB_URL: zod_1.z.string("WEB_URL must be present"),
    DOCS_URL: zod_1.z.string().optional(),
});
function formatZodError(label, err) {
    var _a;
    var flat = err.flatten();
    var fieldErrors = Object.entries(flat.fieldErrors)
        .map(function (_a) {
        var k = _a[0], v = _a[1];
        // v is `unknown` to TS; make it a string[] safely
        var msgs = Array.isArray(v) ? v : [];
        return "  - ".concat(k, ": ").concat(msgs.join(", "));
    })
        .join("\n");
    var formErrors = ((_a = flat.formErrors) !== null && _a !== void 0 ? _a : []).map(function (e) { return "  - ".concat(e); }).join("\n");
    return "[".concat(label, "] Invalid configuration\n").concat(fieldErrors).concat(formErrors ? "\n".concat(formErrors) : "");
}
function parseServerConfig(env) {
    var res = exports.ZServerConfig.safeParse(env);
    if (!res.success)
        throw new Error(formatZodError("ServerConfig", res.error));
    return res.data;
}
function parsePublicConfig(env) {
    var res = exports.ZPublicConfig.safeParse(env);
    if (!res.success)
        throw new Error(formatZodError("PublicConfig", res.error));
    return res.data;
}
/** Convenience: parse both in one call (optionally cached) */
var _cache = null;
function parseEnv(env) {
    return {
        server: parseServerConfig(env),
        public: parsePublicConfig(env),
    };
}
/** Return only server-side envs */
function getServerEnv(env) {
    if (env === void 0) { env = process.env; }
    return parseServerConfig(env);
}
function getPublicEnv(env) {
    if (env === void 0) { env = process.env; }
    return parsePublicConfig(env);
}
function getEnv(env) {
    if (env === void 0) { env = process.env; }
    return (_cache !== null && _cache !== void 0 ? _cache : (_cache = parseEnv(env)));
}
