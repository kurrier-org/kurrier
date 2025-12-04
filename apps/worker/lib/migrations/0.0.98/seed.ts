import { CalendarInsertSchema, calendars, davAccounts, db } from "@db";
import { and, eq } from "drizzle-orm";
import slugify from "@sindresorhus/slugify";
import {
	davCalendarInstances,
	davCalendars,
	davDb,
} from "../../../lib/dav/dav-schema";

const DEFAULT_CALENDAR_NAME = "Default Calendar";
const DEFAULT_CALENDAR_SLUG = slugify(DEFAULT_CALENDAR_NAME);
const DEFAULT_CALENDAR_COLOR = "#3b82f6";

const seedDefaultCalendar = async (userId: string) => {
	const [existing] = await db
		.select()
		.from(calendars)
		.where(and(eq(calendars.ownerId, userId), eq(calendars.isDefault, true)))
		.limit(1);

	if (existing) {
		console.log(`User ${userId}: default calendar already exists`);
		return existing;
	}

	const [davAccount] = await db
		.select()
		.from(davAccounts)
		.where(eq(davAccounts.ownerId, userId))
		.limit(1);

	if (!davAccount) {
		console.warn(
			`User ${userId}: cannot create default calendar — no davAccount found`,
		);
		return null;
	}

	const principalUri = `principals/${davAccount.username}`;
	const remotePath = `calendars/${davAccount.username}/default`;

	const [davCalendarInstance] = await davDb
		.select()
		.from(davCalendarInstances)
		.where(
			and(
				eq(davCalendarInstances.principaluri, principalUri),
				eq(davCalendarInstances.uri, "default"),
			),
		)
		.limit(1);

	if (!davCalendarInstance) {
		console.warn(
			`User ${userId}: cannot create default calendar — no CalDAV calendar instance found`,
		);
		return null;
	}

	const [davCalendar] = await davDb
		.select()
		.from(davCalendars)
		.where(eq(davCalendars.id, Number(davCalendarInstance.calendarid)));

	if (!davCalendar) {
		console.error(
			`User ${userId}: cannot create default calendar — no CalDAV calendar found`,
		);
		return null;
	}

	const syncToken =
		davCalendar.synctoken != null ? String(davCalendar.synctoken) : "1";

	const payload = CalendarInsertSchema.parse({
		ownerId: userId,
		davAccountId: davAccount.id,
		davCalendarId: davCalendarInstance.calendarid,
		davSyncToken: syncToken,
		remotePath,
		name: DEFAULT_CALENDAR_NAME,
		slug: DEFAULT_CALENDAR_SLUG,
		timezone: davCalendarInstance.timezone || "UTC",
		color: DEFAULT_CALENDAR_COLOR,
		isDefault: true,
	});

	const [created] = await db.insert(calendars).values(payload).returning();

	console.log(
		`User ${userId}: default calendar created (calendar_id=${created.id}, dav_calendar_id=${davCalendarInstance.calendarid})`,
	);

	return created;
};

export default async function seed({ userId }: { userId: string }) {
	await seedDefaultCalendar(userId);
	console.info("Migration 0.0.98 - seed.ts executed");
}
