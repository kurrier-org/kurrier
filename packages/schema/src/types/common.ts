export const apiScopeList = [
	"emails:send",
	"templates:read",
	"templates:write",
] as const;
export const apiScopeOptions = apiScopeList.map((scope) => ({
	value: scope,
	label:
		{
			"emails:send": "emails:send",
			"templates:read": "templates:read",
			"templates:write": "templates:write",
		}[scope] ?? scope,
}));
