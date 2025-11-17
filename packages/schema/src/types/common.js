"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webHookList = exports.apiScopeOptions = exports.apiScopeList = void 0;
exports.apiScopeList = [
	"emails:send",
	"emails:receive",
	"templates:read",
	"templates:write",
];
exports.apiScopeOptions = exports.apiScopeList.map(function (scope) {
	var _a;
	return {
		value: scope,
		label:
			(_a = {
				"emails:send": "emails:send",
				"emails:receive": "emails:receive",
				"templates:read": "templates:read",
				"templates:write": "templates:write",
			}[scope]) !== null && _a !== void 0
				? _a
				: scope,
	};
});
exports.webHookList = ["message.received"];
