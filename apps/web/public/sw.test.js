import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./sw.js", import.meta.url), "utf8");
test("service worker routes notification clicks through same-origin app navigation", () => {
	assert.match(source, /notificationclick/);
	assert.match(source, /event\.notification/);
	assert.match(source, /target\.origin !== self\.location\.origin/);
	assert.match(source, /openWindow\(target\)/);
});
test("service worker payload is generic and does not forward notification content", () => {
	assert.match(source, /data: \{ url: "\/" \}/);
	assert.doesNotMatch(source, /subject|messageId|accessToken/);
});
