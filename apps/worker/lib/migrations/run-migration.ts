import { db, appMigrations } from "@db";
import { compare as compareSemver } from "semver";
import { MIGRATION_REGISTRY } from "./index";

type Semver = string;

function getVersionsBetween(fromV: Semver | null, toV: Semver): string[] {
	const versionDirs = Object.keys(MIGRATION_REGISTRY) as Semver[];

	const sorted = versionDirs.sort(compareSemver);

	const filtered = sorted.filter((v) => {
		if (compareSemver(v, toV) === 1) return false;
		if (!fromV) return true;
		return compareSemver(v, fromV) === 1;
	});

	return filtered;
}

export async function runMigrationsForUser(
	userId: string,
	fromVersion: Semver | null,
	toVersion: Semver,
) {
	const versions = getVersionsBetween(fromVersion, toVersion);
	for (const version of versions) {
		const mod = MIGRATION_REGISTRY[version];
		if (!mod) {
			console.warn(`No migration module registered for version ${version}`);
			continue;
		}
		const fn = (mod as any).default as
			| ((args: { userId: string }) => Promise<unknown> | unknown)
			| undefined;

		if (typeof fn === "function") {
			await fn({ userId });
			console.log(`Migration ${version} - seed.ts executed`);
		} else {
			console.warn(`Migration ${version} has no default export function`);
		}

		await db
			.insert(appMigrations)
			.values({
				ownerId: userId,
				version,
				scope: "app",
			})
			.onConflictDoNothing();
	}
}
