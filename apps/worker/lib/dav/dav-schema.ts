import { sqliteTable, integer, text, blob } from "drizzle-orm/sqlite-core";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import crypto from "node:crypto";
import fs from "node:fs";

export const davAddressbooks = sqliteTable("addressbooks", {
	id: integer("id").primaryKey(),
	principaluri: text("principaluri").notNull(),
	displayname: text("displayname"),
	uri: text("uri").notNull(),
	description: text("description"),
	synctoken: integer("synctoken").notNull().default(1),
});

export const davCards = sqliteTable("cards", {
	id: integer("id").primaryKey(),
	addressbookid: integer("addressbookid").notNull(),
	carddata: blob("carddata"),
	uri: text("uri").notNull(),
	lastmodified: integer("lastmodified"),
	etag: text("etag"),
	size: integer("size"),
});

export const davAddressbookChanges = sqliteTable("addressbookchanges", {
	id: integer("id").primaryKey(),
	uri: text("uri"),
	synctoken: integer("synctoken").notNull(),
	addressbookid: integer("addressbookid").notNull(),
	operation: integer("operation").notNull(),
});

export const davCalendarObjects = sqliteTable("calendarobjects", {
	id: integer("id").primaryKey(),
	calendardata: blob("calendardata").notNull(),
	uri: text("uri").notNull(),
	calendarid: integer("calendarid").notNull(),
	lastmodified: integer("lastmodified").notNull(),
	etag: text("etag").notNull(),
	size: integer("size").notNull(),
	componenttype: text("componenttype"),
	firstoccurence: integer("firstoccurence"),
	lastoccurence: integer("lastoccurence"),
	uid: text("uid"),
});

export const davCalendars = sqliteTable("calendars", {
	id: integer("id").primaryKey(),
	synctoken: integer("synctoken").notNull().default(1),
	components: text("components").notNull(),
});

export const davCalendarInstances = sqliteTable("calendarinstances", {
	id: integer("id").primaryKey(),
	calendarid: integer("calendarid"),
	principaluri: text("principaluri"),
	access: integer("access"),
	displayname: text("displayname"),
	uri: text("uri").notNull(),
	description: text("description"),
	calendarorder: integer("calendarorder"),
	calendarcolor: text("calendarcolor"),
	timezone: text("timezone"),
	transparent: integer("transparent"),
	share_href: text("share_href"),
	share_displayname: text("share_displayname"),
	share_invitestatus: integer("share_invitestatus").default(2),
});

export const davCalendarChanges = sqliteTable("calendarchanges", {
	id: integer("id").primaryKey(),
	uri: text("uri"),
	synctoken: integer("synctoken").notNull(),
	calendarid: integer("calendarid").notNull(),
	operation: integer("operation").notNull(),
});

export const davCalendarSubscriptions = sqliteTable("calendarsubscriptions", {
	id: integer("id").primaryKey(),
	uri: text("uri").notNull(),
	principaluri: text("principaluri").notNull(),
	source: text("source").notNull(),
	displayname: text("displayname"),
	refreshrate: text("refreshrate"),
	calendarorder: integer("calendarorder"),
	calendarcolor: text("calendarcolor"),
	striptodos: integer("striptodos"),
	stripalarms: integer("stripalarms"),
	stripattachments: integer("stripattachments"),
	lastmodified: integer("lastmodified"),
});

export const davSchedulingObjects = sqliteTable("schedulingobjects", {
	id: integer("id").primaryKey(),
	principaluri: text("principaluri").notNull(),
	calendardata: blob("calendardata"),
	uri: text("uri").notNull(),
	lastmodified: integer("lastmodified"),
	etag: text("etag").notNull(),
	size: integer("size").notNull(),
});

export const davLocks = sqliteTable("locks", {
	id: integer("id").primaryKey(),
	owner: text("owner"),
	timeout: integer("timeout"),
	created: integer("created"),
	token: text("token"),
	scope: integer("scope"),
	depth: integer("depth"),
	uri: text("uri"),
});

export const davPrincipals = sqliteTable("principals", {
	id: integer("id").primaryKey(),
	uri: text("uri").notNull(),
	email: text("email"),
	displayname: text("displayname"),
});

export const davGroupMembers = sqliteTable("groupmembers", {
	id: integer("id").primaryKey(),
	principal_id: integer("principal_id").notNull(),
	member_id: integer("member_id").notNull(),
});

export const davPropertyStorage = sqliteTable("propertystorage", {
	id: integer("id").primaryKey(),
	path: text("path").notNull(),
	name: text("name").notNull(),
	valuetype: integer("valuetype").notNull(),
	value: text("value"),
});

export const davUsers = sqliteTable("users", {
	id: integer("id").primaryKey(),
	username: text("username").notNull(),
	digesta1: text("digesta1").notNull(),
});

const isProd = process.env.NODE_ENV === "production";

const dbPath = isProd
	? "/dav-data/db/db.sqlite"
	: path.resolve(process.cwd(), "../../db/dav_data/db/db.sqlite");

if (!fs.existsSync(dbPath)) {
	console.error("DAV sqlite not found at", dbPath);
}

const client = createClient({ url: `file:${dbPath}` });
export const davDb = drizzle(client);

export const md5 = (input: string) =>
	crypto.createHash("md5").update(input).digest("hex");

export type DavCardsEntity = typeof davCards.$inferSelect;
export type DavCalendarObjectEntity = typeof davCalendarObjects.$inferSelect;
