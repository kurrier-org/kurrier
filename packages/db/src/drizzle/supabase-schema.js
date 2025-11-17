"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objects = exports.decryptedSecrets = exports.users = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var authSchema = (0, pg_core_1.pgSchema)("auth");
var storageSchema = (0, pg_core_1.pgSchema)("storage");
var vaultSchema = (0, pg_core_1.pgSchema)("vault");
exports.users = authSchema.table("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    email: (0, pg_core_1.varchar)(),
    raw_user_meta_data: (0, pg_core_1.jsonb)(),
});
exports.decryptedSecrets = (0, pg_core_1.pgView)("decrypted_secrets", {
    id: (0, pg_core_1.uuid)("id"),
    name: (0, pg_core_1.text)("name"),
    description: (0, pg_core_1.text)("description"),
    decrypted_secret: (0, pg_core_1.text)("decrypted_secret"),
}).existing();
exports.objects = storageSchema.table("objects", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    name: (0, pg_core_1.text)(),
});
