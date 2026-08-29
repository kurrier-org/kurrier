import assert from "node:assert/strict";
import test from "node:test";
import { compensateMicrosoftOAuthResources } from "./microsoft-compensation";

test("attempts every OAuth compensation independently and logs safe errors", async () => {
	const attempted: string[] = [];
	const logs: unknown[] = [];
	await compensateMicrosoftOAuthResources(
		"correlation-id",
		["identity", "account", "link", "secret"].map((resource) => ({
			resource,
			cleanup: async () => {
				attempted.push(resource);
				if (resource === "account") throw new Error("database detail");
			},
		})),
		(entry) => logs.push(entry),
	);
	assert.deepEqual(attempted, ["identity", "account", "link", "secret"]);
	assert.deepEqual(logs, [
		{
			correlationId: "correlation-id",
			resource: "account",
			error: "database detail",
		},
	]);
});
