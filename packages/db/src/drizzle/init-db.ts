import {
	drizzle,
	type PostgresJsDatabase,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@schema";
import type * as schema from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

declare global {
	var _db: Database | undefined;
	var _db_rls: Database | undefined;
}

export const createDb = (): Database => {
	const { DATABASE_URL } = getServerEnv();

	if (!global._db) {
		const client = postgres(String(DATABASE_URL), {
			prepare: false,
		});

		global._db = drizzle(client) as Database;
	}

	return global._db;
};

export const createDbRls = (): Database => {
	const { DATABASE_RLS_URL } = getServerEnv();

	if (!global._db_rls) {
		const client = postgres(String(DATABASE_RLS_URL), {
			prepare: false,
		});

		global._db_rls = drizzle(client) as Database;
	}

	return global._db_rls;
};

export const db = createDb();
export const db_rls = createDbRls();
