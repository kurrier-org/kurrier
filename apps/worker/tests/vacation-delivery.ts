import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "pg";

async function main() {
	const schema = "vacation_delivery_" + randomUUID().replaceAll("-", "");
	const admin = new Client({ connectionString: process.env.DATABASE_URL });
	await admin.connect();
	let database:
		| { $client: { end: (options: object) => Promise<void> } }
		| undefined;
	try {
		await admin.query('CREATE SCHEMA "' + schema + '"');
		await admin.query('SET search_path TO "' + schema + '"');
		await admin.query(
			"CREATE TABLE workspaces(id uuid PRIMARY KEY); CREATE TABLE identities(id uuid PRIMARY KEY,workspace_id uuid,value text); CREATE TABLE mailboxes(id uuid PRIMARY KEY,identity_id uuid,workspace_id uuid,kind text); CREATE TABLE messages(id uuid PRIMARY KEY,mailbox_id uuid)",
		);
		await admin.query(
			readFileSync("db/init/migrations/013_migration.sql", "utf8"),
		);
		const url = new URL(String(process.env.DATABASE_URL));
		url.searchParams.set("options", "-csearch_path=" + schema);
		process.env.DATABASE_URL = url.toString();
		const { db } = await import("@db");
		database = db as unknown as typeof database;
		const { reserveVacationReply } = await import("../lib/vacation/reserve");
		const { deliverVacation } = await import("../lib/vacation/delivery");
		const identity = randomUUID(),
			workspace = randomUUID(),
			inbox = randomUUID(),
			sent = randomUUID(),
			message = randomUUID();
		await admin.query("INSERT INTO workspaces VALUES($1)", [workspace]);
		await admin.query(
			"INSERT INTO identities VALUES($1,$2,'support@example.com')",
			[identity, workspace],
		);
		await admin.query(
			"INSERT INTO mailboxes VALUES($1,$2,$3,'inbox'),($4,$2,$3,'sent')",
			[inbox, identity, workspace, sent],
		);
		await admin.query("INSERT INTO messages VALUES($1,$2)", [message, inbox]);
		await admin.query(
			"INSERT INTO vacation_settings(identity_id,workspace_id,enabled,subject,message,activated_at) VALUES($1,$2,true,'Away','Back soon',now()-interval '1 day')",
			[identity, workspace],
		);
		const incoming = {
			id: message,
			mailboxId: inbox,
			headersJson: { "return-path": "<sender@example.com>" },
		};
		await Promise.all([
			reserveVacationReply(db, incoming),
			reserveVacationReply(db, incoming),
		]);
		const rows = await admin.query("SELECT id FROM vacation_replies");
		assert.equal(rows.rowCount, 1);
		const id = rows.rows[0].id;
		let submitted = 0;
		await deliverVacation(id, async (_payload, accepted) => {
			submitted++;
			await accepted("provider-123");
			throw new Error("Simulated sent-copy failure");
		});
		assert.equal(
			(await admin.query("SELECT status FROM vacation_replies")).rows[0].status,
			"accepted",
		);
		await deliverVacation(id, async (_payload, _accepted, prior) => {
			assert.equal(prior?.MessageId, "provider-123");
			return { success: true };
		});
		assert.equal(submitted, 1);
		assert.equal(
			(await admin.query("SELECT status FROM vacation_replies")).rows[0].status,
			"reconciled",
		);
		await deliverVacation(id, async () => {
			throw new Error("Must not submit twice");
		});
		await admin.query(
			"UPDATE vacation_settings SET period_id=gen_random_uuid(),enabled=false",
		);
		await reserveVacationReply(db, incoming);
		assert.equal(
			(await admin.query("SELECT count(*)::int AS count FROM vacation_replies"))
				.rows[0].count,
			1,
		);
		console.log(
			"Passed actual reservation, provider acceptance, reconciliation retry, duplicate and disabled-period checks",
		);
	} finally {
		await database?.$client.end({ timeout: 1 });
		await admin.query('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
		await admin.end();
	}
}
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
