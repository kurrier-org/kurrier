import { defineConfig } from "drizzle-kit";
import { getServerEnv } from "@schema/types/config";
import { DISTRIBUTION_SCHEMAS } from "@distribution/schemas";

const { DATABASE_URL } = getServerEnv();
export default defineConfig({
	dialect: "postgresql",
	schema: [...DISTRIBUTION_SCHEMAS],
	schemaFilter: ["public"],
	out: "./src/drizzle",
	dbCredentials: {
		url: String(DATABASE_URL),
	},
});
