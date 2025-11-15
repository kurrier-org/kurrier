export const apiScopeList = [
	"emails:send",
	"emails:receive",
	"templates:read",
	"templates:write",
] as const;
export const apiScopeOptions = apiScopeList.map((scope) => ({
	value: scope,
	label:
		{
			"emails:send": "emails:send",
			"emails:receive": "emails:receive",
			"templates:read": "templates:read",
			"templates:write": "templates:write",
		}[scope] ?? scope,
}));
export const webHookList = [
    "message.received"
] as const;
