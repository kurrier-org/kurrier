"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESOLVED_COOKIE = exports.MODE_COOKIE = exports.THEME_COOKIE = exports.AppearanceSchema = exports.ThemeModeSchema = exports.ThemeNameSchema = exports.THEME_MODES = exports.THEME_NAMES = void 0;
var zod_1 = require("zod");
exports.THEME_NAMES = ["brand", "indigo", "violet", "teal"];
exports.THEME_MODES = ["light", "dark", "system"];
exports.ThemeNameSchema = zod_1.z.enum(exports.THEME_NAMES);
exports.ThemeModeSchema = zod_1.z.enum(exports.THEME_MODES);
exports.AppearanceSchema = zod_1.z.object({
    theme: exports.ThemeNameSchema,
    mode: exports.ThemeModeSchema,
});
exports.THEME_COOKIE = "kurrier.theme"; // "indigo" | "violet" | "teal"
exports.MODE_COOKIE = "kurrier.mode"; // "light" | "dark" | "system"
exports.RESOLVED_COOKIE = "kurrier.resolved"; // "light" | "dark"
