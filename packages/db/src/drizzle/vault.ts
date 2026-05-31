import { eq } from "drizzle-orm";
import { createDrizzleClientInstance } from "./drizzle-client";
import { secretsMeta } from "./schema";
import { createDb } from "./init-db";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { getServerEnv } from "@schema";

type DecryptedEntity = {
	id: string;
	name: string | null;
	description: string | null;
	decrypted_secret: string;
};

function getKey() {
	const { APP_SECRET_ENCRYPTION_KEY } = getServerEnv();
	const key = Buffer.from(String(APP_SECRET_ENCRYPTION_KEY));
	if (key.length === 32) return key;
	if (key.length > 32) return key.subarray(0, 32);
	const out = Buffer.alloc(32);
	key.copy(out);
	return out;
}

function encrypt(plaintext: string) {
	const key = getKey();
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return {
		encryptedValue: encrypted.toString("base64"),
		iv: iv.toString("base64"),
		authTag: authTag.toString("base64"),
		keyVersion: 1,
	};
}

function decrypt(payload: { encryptedValue: string; iv: string; authTag: string }) {
	const key = getKey();
	const iv = Buffer.from(payload.iv, "base64");
	const authTag = Buffer.from(payload.authTag, "base64");
	const ciphertext = Buffer.from(payload.encryptedValue, "base64");
	const decipher = createDecipheriv("aes-256-gcm", key, iv);
	decipher.setAuthTag(authTag);
	const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
	return decrypted.toString("utf8");
}

export async function listSecrets(session: string, workspaceId: string) {
	const db = await createDrizzleClientInstance(session, { workspaceId });
	return db.rls((tx) => tx.select().from(secretsMeta));
}

export async function createSecret(
	session: string,
	workspaceId: string,
	input: { name: string; value: string },
) {
	const db = await createDrizzleClientInstance(session, { workspaceId });
	const { rls } = db;

	const enc = encrypt(input.value);

	const rows = await rls((tx) =>
		tx
			.insert(secretsMeta)
			.values({
				name: input.name,
				encryptedValue: enc.encryptedValue,
				iv: enc.iv,
				authTag: enc.authTag,
				keyVersion: enc.keyVersion,
			})
			.returning(),
	);

	return rows[0]!;
}

export async function createSecretAdmin(input: {
	ownerId: string;
	workspaceId: string;
	name: string;
	value: string;
	description?: string | null;
}) {
	const db = createDb();
	const enc = encrypt(input.value);

	const [row] = await db
		.insert(secretsMeta)
		.values({
			ownerId: input.ownerId,
			workspaceId: input.workspaceId,
			name: input.name,
			description: input.description ?? null,
			encryptedValue: enc.encryptedValue,
			iv: enc.iv,
			authTag: enc.authTag,
			keyVersion: enc.keyVersion,
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

	const value = decrypt({
		encryptedValue: (meta as any).encryptedValue,
		iv: (meta as any).iv,
		authTag: (meta as any).authTag,
	});

	const vault: DecryptedEntity = {
		id: String(meta.id),
		name: (meta as any).name ?? null,
		description: (meta as any).description ?? null,
		decrypted_secret: value,
	};

	return { metaSecret: meta, vault };
}

export async function getSecret(
	session: string,
	id: string,
	workspaceId?: string,
) {
	const db = await createDrizzleClientInstance(session, { workspaceId });
	const { rls } = db;

	const meta = await rls((tx) =>
		tx.select().from(secretsMeta).where(eq(secretsMeta.id, id)).limit(1),
	).then((r) => r[0]);

	if (!meta) throw new Error("Not found or not allowed");

	const value = decrypt({
		encryptedValue: (meta as any).encryptedValue,
		iv: (meta as any).iv,
		authTag: (meta as any).authTag,
	});

	const vault: DecryptedEntity = {
		id: String(meta.id),
		name: (meta as any).name ?? null,
		description: (meta as any).description ?? null,
		decrypted_secret: value,
	};

	return { metaSecret: meta, vault };
}

export async function updateSecret(
	session: string,
	workspaceId: string,
	id: string,
	input: { value?: string; name?: string },
) {
	const db = await createDrizzleClientInstance(session, { workspaceId });
	const { rls } = db;

	const meta = await rls((tx) =>
		tx.select().from(secretsMeta).where(eq(secretsMeta.id, id)).limit(1),
	).then((r) => r[0]);
	if (!meta) throw new Error("Not found or not allowed");

	const patch: Record<string, any> = {};
	if (input.name !== undefined) patch.name = input.name;
	if (input.value !== undefined) {
		const enc = encrypt(input.value);
		patch.encryptedValue = enc.encryptedValue;
		patch.iv = enc.iv;
		patch.authTag = enc.authTag;
		patch.keyVersion = enc.keyVersion;
	}

	if (Object.keys(patch).length === 0) return meta;

	const rows = await rls((tx) =>
		tx.update(secretsMeta).set(patch).where(eq(secretsMeta.id, id)).returning(),
	);

	return rows[0]!;
}

export async function deleteSecret(
	session: string,
	id: string,
	workspaceId: string,
) {
	const db = await createDrizzleClientInstance(session, { workspaceId });
	const { rls } = db;

	const meta = await rls((tx) =>
		tx.select().from(secretsMeta).where(eq(secretsMeta.id, id)).limit(1),
	).then((r) => r[0]);
	if (!meta) return;

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

	const patch: Record<string, any> = {};
	if (input.name !== undefined) patch.name = input.name;
	if (input.value !== undefined) {
		const enc = encrypt(input.value);
		patch.encryptedValue = enc.encryptedValue;
		patch.iv = enc.iv;
		patch.authTag = enc.authTag;
		patch.keyVersion = enc.keyVersion;
	}

	if (Object.keys(patch).length === 0) return meta;

	const rows = await db
		.update(secretsMeta)
		.set(patch)
		.where(eq(secretsMeta.id, id))
		.returning();

	return rows[0]!;
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

	await db.delete(secretsMeta).where(eq(secretsMeta.id, id));
}

