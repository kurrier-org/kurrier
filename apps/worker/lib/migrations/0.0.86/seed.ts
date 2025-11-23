import {db, labels} from "@db";
import {and, eq} from "drizzle-orm";
import {LabelScope} from "@schema";
import { seedAccount } from "../../../lib/dav/dav-seed-account";

const seedFavoriteLabel = async (userId: string) => {
    const [existing] = await db
        .select({ id: labels.id })
        .from(labels)
        .where(
            and(
                eq(labels.ownerId, userId),
                eq(labels.slug, "favorite"),
                eq(labels.scope, "contact" as LabelScope)
            )
        )
        .limit(1);

    if (existing) {
        return
    }

    await db.insert(labels).values({
        ownerId: userId,
        name: "Favorite",
        slug: "favorite",
        scope: "contact" as LabelScope,
        isSystem: true,
        colorBg: "#facc15",
    });
};



export default async function seed({ userId }: { userId: string }) {

    await seedFavoriteLabel(userId)
    await seedAccount(userId)

    console.log("Migration 0.0.86 - seed.ts executed");
}
