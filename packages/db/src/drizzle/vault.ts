import { eq, sql } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { createDrizzleSupabaseClient } from "./drizzle-client";
import { secretsMeta } from "./schema";
import { DecryptedEntity } from "./drizzle-types";
import { AuthSession } from "@supabase/supabase-js";
import { createDb } from "./init-db";

async function vaultCreateSecret(
	tx: PgTransaction<any, any, any>,
	opts: { name: string; secret: string },
) {
	const { name, secret } = opts;
	const rows = await tx.execute(
		sql`select vault.create_secret(${secret}, ${name}) as id`,
	);

	const id = (rows as any)[0]?.id as string | undefined;
	if (!id) throw new Error("vault.create_secret did not return an id");
	return id;
}

async function vaultUpdateSecret(
	tx: PgTransaction<any, any, any>,
	id: string,
	secret: string,
) {
	await tx.execute(sql`select vault.update_secret(${id}, ${secret})`);
}

async function vaultDeleteSecret(tx: PgTransaction<any, any, any>, id: string) {
	await tx.execute(sql`select vault.delete_secret(${id})`);
}

async function vaultGetSecret(
	tx: PgTransaction<any, any, any>,
	id: string,
): Promise<DecryptedEntity | null> {
	const [row]: [DecryptedEntity] = await tx.execute(
		sql`select id, name, description, decrypted_secret
        from vault.decrypted_secrets
        where id = ${id}
        limit 1`,
	);

	return row ?? null;
}

export async function listSecrets(session: AuthSession) {
	const db = await createDrizzleSupabaseClient(session);
	return db.rls((tx) => tx.select().from(secretsMeta));
}

export async function createSecret(
	session: AuthSession,
	input: { name: string; value: string },
) {
	const db = await createDrizzleSupabaseClient(session);
	const { admin, rls } = db;

	const vaultId = await admin.transaction((tx) =>
		vaultCreateSecret(tx, {
			name: input.name,
			secret: input.value,
		}),
	);

	const rows = await rls((tx) =>
		tx
			.insert(secretsMeta)
			.values({
				name: input.name,
				vaultSecret: vaultId,
			})
			.returning(),
	);

	return rows[0]!;
}

export async function createSecretAdmin(input: {
	ownerId: string;
	name: string;
	value: string;
	description?: string | null;
}) {
	const db = createDb();

	const vaultId = await db.transaction((tx) =>
		vaultCreateSecret(tx, {
			name: input.name,
			secret: input.value,
		}),
	);

	const [row] = await db
		.insert(secretsMeta)
		.values({
			ownerId: input.ownerId,
			name: input.name,
			description: input.description ?? null,
			vaultSecret: vaultId,
		})
		.returning();

	return row;
}

export async function getSecretAdmin(id: string) {
	const db = createDb();
	const meta = await db
		.select()
		.from(secretsMeta)
		.where(eq(secretsMeta.id, id))
		.limit(1)
		.then((r) => r[0]);

	if (!meta) throw new Error("Secret metadata not found");

	const vault = await db.transaction((tx) =>
		vaultGetSecret(tx, meta.vaultSecret),
	);

	return { metaSecret: meta, vault };
}

export async function getSecret(session: AuthSession, id: string) {
	const db = await createDrizzleSupabaseClient(session);
	const { admin, rls } = db;

	const meta = await rls((tx) =>
		tx.select().from(secretsMeta).where(eq(secretsMeta.id, id)).limit(1),
	).then((r) => r[0]);

	if (!meta) throw new Error("Not found or not allowed");

	const vault = await admin.transaction((tx) =>
		vaultGetSecret(tx, meta.vaultSecret),
	);

	return { metaSecret: meta, vault };
}

export async function updateSecret(
	session: AuthSession,
	id: string,
	input: { value?: string; name?: string },
) {
	const db = await createDrizzleSupabaseClient(session);
	const { admin, rls } = db;

	const meta = await rls((tx) =>
		tx.select().from(secretsMeta).where(eq(secretsMeta.id, id)).limit(1),
	).then((r) => r[0]);
	if (!meta) throw new Error("Not found or not allowed");

	if (input.value !== undefined) {
		await admin.transaction((tx) =>
			vaultUpdateSecret(tx, meta.vaultSecret, input.value!),
		);
	}

	if (input.name !== undefined) {
		const rows = await rls((tx) =>
			tx
				.update(secretsMeta)
				.set({
					...(input.name !== undefined ? { name: input.name } : {}),
				})
				.where(eq(secretsMeta.id, id))
				.returning(),
		);
		return rows[0]!;
	}

	return meta;
}

export async function deleteSecret(session: AuthSession, id: string) {
	const db = await createDrizzleSupabaseClient(session);
	const { admin, rls } = db;

	const meta = await rls((tx) =>
		tx.select().from(secretsMeta).where(eq(secretsMeta.id, id)).limit(1),
	).then((r) => r[0]);
	if (!meta) return;

	await admin.transaction((tx) => vaultDeleteSecret(tx, meta.vaultSecret));

	await rls((tx) => tx.delete(secretsMeta).where(eq(secretsMeta.id, id)));
}

export async function updateSecretAdmin(
	id: string,
	input: { value?: string; name?: string },
) {
	const db = createDb();
	const meta = await db
		.select()
		.from(secretsMeta)
		.where(eq(secretsMeta.id, id))
		.limit(1)
		.then((r) => r[0]);

	if (!meta) {
		throw new Error("Secret metadata not found");
	}
	if (input.value !== undefined) {
		await db.transaction((tx) =>
			vaultUpdateSecret(tx, meta.vaultSecret, input.value!),
		);
	}
	if (input.name !== undefined) {
		const rows = await db
			.update(secretsMeta)
			.set({ name: input.name })
			.where(eq(secretsMeta.id, id))
			.returning();

		return rows[0]!;
	}
	return meta;
}

export async function deleteSecretAdmin(id: string) {
	const db = createDb();
	const meta = await db
		.select()
		.from(secretsMeta)
		.where(eq(secretsMeta.id, id))
		.limit(1)
		.then((rows) => rows[0]);

	if (!meta) return;
	await db.transaction((tx) => vaultDeleteSecret(tx, meta.vaultSecret));
	await db.delete(secretsMeta).where(eq(secretsMeta.id, id));
}
