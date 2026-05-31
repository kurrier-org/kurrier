import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import postgres from "postgres";
import { drizzle } from 'drizzle-orm/postgres-js';

import { customType } from "drizzle-orm/pg-core";

export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
	dataType() {
		return "bytea";
	},
	toDriver(value) {
		return value;
	},
	fromDriver(value) {
		return Buffer.isBuffer(value) ? value : Buffer.from(value as any);
	},
});

import crypto from "node:crypto";


export const davAddressbooks = pgTable("addressbooks", {
	id: serial("id").primaryKey(),
	principaluri: text("principaluri").notNull(),
	displayname: text("displayname"),
	uri: text("uri").notNull(),
	description: text("description"),
	synctoken: integer("synctoken").notNull().default(1),
});

export const davCards = pgTable("cards", {
	id: serial("id").primaryKey(),
	addressbookid: integer("addressbookid").notNull(),
	carddata: bytea("carddata"),
	uri: text("uri").notNull(),
	lastmodified: integer("lastmodified"),
	etag: text("etag"),
	size: integer("size"),
});

export const davAddressbookChanges = pgTable("addressbookchanges", {
	id: serial("id").primaryKey(),
	uri: text("uri"),
	synctoken: integer("synctoken").notNull(),
	addressbookid: integer("addressbookid").notNull(),
	operation: integer("operation").notNull(),
});

export const davCalendarObjects = pgTable("calendarobjects", {
	id: serial("id").primaryKey(),
	calendardata: bytea("calendardata").notNull(),
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

export const davCalendars = pgTable("calendars", {
	id: serial("id").primaryKey(),
	synctoken: integer("synctoken").notNull().default(1),
	components: text("components").notNull(),
});

export const davCalendarInstances = pgTable("calendarinstances", {
	id: serial("id").primaryKey(),
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

export const davCalendarChanges = pgTable("calendarchanges", {
	id: serial("id").primaryKey(),
	uri: text("uri"),
	synctoken: integer("synctoken").notNull(),
	calendarid: integer("calendarid").notNull(),
	operation: integer("operation").notNull(),
});

export const davCalendarSubscriptions = pgTable("calendarsubscriptions", {
	id: serial("id").primaryKey(),
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

export const davSchedulingObjects = pgTable("schedulingobjects", {
	id: serial("id").primaryKey(),
	principaluri: text("principaluri").notNull(),
	calendardata: bytea("calendardata"),
	uri: text("uri").notNull(),
	lastmodified: integer("lastmodified"),
	etag: text("etag").notNull(),
	size: integer("size").notNull(),
});

export const davLocks = pgTable("locks", {
	id: serial("id").primaryKey(),
	owner: text("owner"),
	timeout: integer("timeout"),
	created: integer("created"),
	token: text("token"),
	scope: integer("scope"),
	depth: integer("depth"),
	uri: text("uri"),
});

export const davPrincipals = pgTable("principals", {
	id: serial("id").primaryKey(),
	uri: text("uri").notNull(),
	email: text("email"),
	displayname: text("displayname"),
});

export const davGroupMembers = pgTable("groupmembers", {
	id: serial("id").primaryKey(),
	principal_id: integer("principal_id").notNull(),
	member_id: integer("member_id").notNull(),
});

export const davPropertyStorage = pgTable("propertystorage", {
	id: serial("id").primaryKey(),
	path: text("path").notNull(),
	name: text("name").notNull(),
	valuetype: integer("valuetype").notNull(),
	value: text("value"),
});

export const davUsers = pgTable("users", {
	id: serial("id").primaryKey(),
	username: text("username").notNull(),
	digesta1: text("digesta1").notNull(),
});

const sql = postgres(process.env.DAV_DATABASE_URL!, { prepare: false });
export const davDb = drizzle(sql);

export const md5 = (input: string) =>
	crypto.createHash("md5").update(input).digest("hex");

export type DavCardsEntity = typeof davCards.$inferSelect;
export type DavCalendarObjectEntity = typeof davCalendarObjects.$inferSelect;
