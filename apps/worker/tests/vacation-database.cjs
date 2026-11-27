const { Client } = require("pg");
const { readFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
const assert = require("node:assert/strict");

(async () => {
 const schema = "vacation_test_" + randomUUID().replaceAll("-", "");
 const connection = { connectionString: process.env.DATABASE_URL };
 const admin = new Client(connection);
 await admin.connect();
 try {
  await admin.query('CREATE SCHEMA "'+schema+'"');
  await admin.query('SET search_path TO "'+schema+'"');
  await admin.query("CREATE TABLE workspaces(id uuid PRIMARY KEY); CREATE TABLE identities(id uuid PRIMARY KEY); CREATE TABLE messages(id uuid PRIMARY KEY)");
  await admin.query(readFileSync("db/init/migrations/013_migration.sql","utf8"));
  const identity=randomUUID(), workspace=randomUUID(), message=randomUUID(), period=randomUUID();
  await admin.query("INSERT INTO identities VALUES($1)",[identity]);
  await admin.query("INSERT INTO workspaces VALUES($1)",[workspace]);
  await admin.query("INSERT INTO messages VALUES($1)",[message]);
  const workers = await Promise.all([1,2].map(async () => {
   const client=new Client(connection); await client.connect();
   await client.query('SET search_path TO "'+schema+'"');
   return client;
  }));
  try {
   const sql="INSERT INTO vacation_replies(identity_id,workspace_id,period_id,recipient,message_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id";
   const reservations=await Promise.all(workers.map(c=>c.query(sql,[identity,workspace,period,"sender@example.com",message])));
   assert.equal(reservations.reduce((n,r)=>n+r.rowCount,0),1);
   const claims=await Promise.all(workers.map(c=>c.query("UPDATE vacation_replies SET status='sending' WHERE status='pending' RETURNING id")));
   assert.equal(claims.reduce((n,r)=>n+r.rowCount,0),1);
   await admin.query("DELETE FROM messages WHERE id=$1",[message]);
   assert.equal((await admin.query("SELECT message_id FROM vacation_replies")).rows[0].message_id,null);
   await admin.query(sql,[identity,workspace,randomUUID(),"sender@example.com",null]);
   assert.equal((await admin.query("SELECT count(*)::int AS count FROM vacation_replies")).rows[0].count,2);
   console.log("Passed concurrent reservation, atomic claim, deleted-message history, and new-period checks");
  } finally { await Promise.all(workers.map(c=>c.end())); }
 } finally {
  await admin.query('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');
  await admin.end();
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
