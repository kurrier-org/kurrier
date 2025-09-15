import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "@schema";

declare global {
	// Augment Node globalThis so we can persist clients across hot reloads in dev
	var _db: ReturnType<typeof drizzle> | undefined;
	var _db_rls: ReturnType<typeof drizzle> | undefined;
}

const createDb = () => {
	const { DATABASE_URL } = getServerEnv();
	if (!global._db) {
		const client = postgres(String(DATABASE_URL), { prepare: false });
		global._db = drizzle(client);
	}
	return global._db;
};

const createDbRls = () => {
	const { DATABASE_RLS_URL } = getServerEnv();
	if (!global._db_rls) {
		const client = postgres(String(DATABASE_RLS_URL), { prepare: false });
		global._db_rls = drizzle(client);
	}
	return global._db_rls;
};

export const db = createDb();
export const db_rls = createDbRls();
