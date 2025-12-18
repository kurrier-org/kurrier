import { db, driveVolumes } from "@db";
import { and, eq } from "drizzle-orm";

export const discoverVolumesForOwner = async (ownerId: string) => {
	const basePath = `/users/${ownerId}`;

	const [home] = await db
		.select()
		.from(driveVolumes)
		.where(
			and(eq(driveVolumes.ownerId, ownerId), eq(driveVolumes.code, "home")),
		)
		.limit(1);

	if (home) {
		if (home.basePath !== basePath) {
			await db
				.update(driveVolumes)
				.set({
					basePath,
					updatedAt: new Date(),
				})
				.where(eq(driveVolumes.id, home.id));
		}
	} else {
		await db.insert(driveVolumes).values({
			ownerId,
			kind: "local",
			code: "home",
			label: "Home",
			basePath,
		});
	}

	return await db
		.select()
		.from(driveVolumes)
		.where(eq(driveVolumes.ownerId, ownerId));
};
