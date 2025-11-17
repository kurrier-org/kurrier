"use strict";
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGE_SIZE =
	exports.DEFAULT_COLORS_SWATCH =
	exports.decodeMailboxPath =
	exports.encodeMailboxPath =
	exports.getMessageAddress =
	exports.getMessageName =
	exports.fromAddress =
	exports.fromName =
		void 0;
exports.sanitizeFilename = sanitizeFilename;
var slugify_1 = __importDefault(require("@sindresorhus/slugify"));
var fromName = function (message) {
	var _a, _b, _c, _d;
	var from = message.from;
	if (!from) return null;
	if (typeof from === "string") {
		return (_a = from.split("@")[0]) !== null && _a !== void 0 ? _a : null;
	}
	return (_d =
		(_c = (_b = from.value) === null || _b === void 0 ? void 0 : _b[0]) ===
			null || _c === void 0
			? void 0
			: _c.name) !== null && _d !== void 0
		? _d
		: null;
};
exports.fromName = fromName;
var fromAddress = function (message) {
	var _a, _b, _c;
	var from = message.from;
	if (!from) return null;
	if (typeof from === "string") {
		return from;
	}
	return (_c =
		(_b = (_a = from.value) === null || _a === void 0 ? void 0 : _a[0]) ===
			null || _b === void 0
			? void 0
			: _b.address) !== null && _c !== void 0
		? _c
		: null;
};
exports.fromAddress = fromAddress;
var getMessageName = function (message, field) {
	var _a, _b, _c;
	var value = message[field];
	if (!value) return null;
	if (typeof value === "string") {
		var beforeAt = value.split("@")[0];
		return beforeAt || null;
	}
	return (_c =
		(_b = (_a = value.value) === null || _a === void 0 ? void 0 : _a[0]) ===
			null || _b === void 0
			? void 0
			: _b.name) !== null && _c !== void 0
		? _c
		: null;
};
exports.getMessageName = getMessageName;
var getMessageAddress = function (message, field) {
	var _a, _b, _c;
	if (!message) {
		return "";
	}
	var value = message[field];
	if (!value) return null;
	if (typeof value === "string") {
		return value;
	}
	return (_c =
		(_b = (_a = value.value) === null || _a === void 0 ? void 0 : _a[0]) ===
			null || _b === void 0
			? void 0
			: _b.address) !== null && _c !== void 0
		? _c
		: null;
};
exports.getMessageAddress = getMessageAddress;
function sanitizeFilename(name) {
	var dot = name.lastIndexOf(".");
	var base = dot > 0 ? name.slice(0, dot) : name;
	var ext = dot > 0 ? name.slice(dot) : "";
	var cleanBase = (0, slugify_1.default)(base, {
		separator: "-",
		decamelize: false,
		preserveLeadingUnderscore: true,
	});
	return (cleanBase || "attachment") + ext.toLowerCase();
}
var encodeMailboxPath = function (path) {
	return encodeURIComponent(path).replaceAll("%2F", "~"); // keep nicer URLs
};
exports.encodeMailboxPath = encodeMailboxPath;
var decodeMailboxPath = function (slug) {
	return decodeURIComponent(slug.replaceAll("~", "%2F"));
};
exports.decodeMailboxPath = decodeMailboxPath;
exports.DEFAULT_COLORS_SWATCH = [
	"#2e2e2e",
	"#868e96",
	"#fa5252",
	"#e64980",
	"#be4bdb",
	"#7950f2",
	"#4c6ef5",
	"#228be6",
	"#15aabf",
	"#12b886",
	"#40c057",
	"#82c91e",
	"#fab005",
	"#fd7e14",
];
exports.PAGE_SIZE = 50;
