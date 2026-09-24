"use server";

import { isSignedIn } from "@/lib/actions/auth";
import {
	driveEntries, driveUploadIntents, DriveVolumeEntity,
	driveVolumes
} from "@db";
import { rlsClient } from "@/lib/actions/clients";
import { DriveRouteContext, FormState, handleAction } from "@schema";
import { decode } from "decode-formdata";
import { revalidatePath } from "next/cache";
import {and, eq, sql} from "drizzle-orm";

import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand, HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand
} from "@aws-sdk/client-s3";
import {s3} from "@/lib/create-s3-client";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import { DISTRIBUTION_CONFIG } from "@distribution/config";
import { createHash, randomBytes } from "node:crypto";
import { driveShareLinks } from "@db";
import { gt, isNull } from "drizzle-orm";

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");

function assertDriveEnabled() {
	if (!DISTRIBUTION_CONFIG.features.drive) {
		throw new Error("Drive is disabled");
	}
}

export const normalizeWithinPath = async (segments: string[]) => {
	assertDriveEnabled();
	const cleaned = (segments ?? [])
		.filter(Boolean)
		.map((s) => trimSlashes(decodeURIComponent(s)));

	const isCloud = cleaned[0] === "volumes" && !!cleaned[1];
	const publicId = isCloud ? cleaned[1] : undefined;

	const within = isCloud ? cleaned.slice(2) : cleaned;
	const withinPath = "/" + within.filter(Boolean).join("/");

	const rls = await rlsClient();
	const driveVolume = publicId
		? await rls(async (tx) => {
				const [vol] = await tx
					.select()
					.from(driveVolumes)
					.where(eq(driveVolumes.publicId, publicId))
					.limit(1);
				return vol ?? null;
			})
		: null;

	return {
		scope: driveVolume ? "cloud" : "home",
		within,
		withinPath: withinPath === "/" ? "/" : withinPath,
		driveVolume,
	} satisfies DriveRouteContext;
};

export const fetchVolumes = async () => {
	assertDriveEnabled();
	const user = await isSignedIn();
	const rls = await rlsClient();
	return rls((tx) =>
		tx
			.select()
			.from(driveVolumes)
			.where(eq(driveVolumes.ownerId, String(user?.id))),
	);
};

export const normalizeWithinPathString = async (path: unknown) => {
	assertDriveEnabled();
	const raw = typeof path === "string" ? path : "/";
	const cleaned = "/" + trimSlashes(decodeURIComponent(raw));
	return cleaned === "/" ? "/" : cleaned;
};

const ensureTrailingSlash = (p: string) => (p.endsWith("/") ? p : `${p}/`);
const toVolumeRelativePath = (
	withinVolumeSegments: string[],
	nameOrFolder: string,
) => {
	const base = withinVolumeSegments.filter(Boolean).map(trimSlashes).join("/");
	const full = base ? `${base}/${nameOrFolder}` : nameOrFolder;
	return `/${trimSlashes(full)}`;
};

const joinUiFolderPath = (withinPath: string, name: string) => {
	const base = ensureTrailingSlash(withinPath || "/");
	const leaf = trimSlashes(name);
	const out = `${base}${leaf}`;
	return ensureTrailingSlash(out.startsWith("/") ? out : `/${out}`);
};


export async function addNewFolder(
	_prev: FormState,
	formData: FormData,
): Promise<FormState> {
	return handleAction(async () => {
		assertDriveEnabled();
		const decodedForm = decode(formData) as Record<string, unknown>;

		const name =
			typeof decodedForm.name === "string" ? decodedForm.name.trim() : "";

		if (!name) {
			return { success: false, error: "drive.folderNameRequired" };
		}

		const withinPath = await normalizeWithinPathString(decodedForm.path);

		const publicId =
			typeof decodedForm.publicId === "string" && decodedForm.publicId.trim()
				? decodedForm.publicId.trim()
				: undefined;

		if (!publicId) {
			return { success: false, error: "drive.missingVolume" };
		}

		const rls = await rlsClient();

		const volume = await rls(async (tx) => {
			const [vol] = await tx
				.select()
				.from(driveVolumes)
				.where(eq(driveVolumes.publicId, publicId))
				.limit(1);

			return vol ?? null;
		});

		if (!volume) {
			return { success: false, error: "drive.volumeNotFound" };
		}

		if (volume.kind !== "cloud") {
			return { success: false, error: "drive.invalidVolumeType" };
		}

		const bucket = String(volume.metaData?.bucket || "").trim();

		if (!bucket) {
			return { success: false, error: "drive.cloudVolumeMissingBucket" };
		}

		const volumePrefix = getVolumePrefix(volume);
		const uiFolderPath = joinUiFolderPath(withinPath, name);
		const relativeKey = trimSlashes(uiFolderPath);
		const key = `${volumePrefix}${relativeKey}/`;

		await s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: "",
				ContentType: "application/x-directory",
				Metadata: {
					kind: "folder",
					volumeId: String(volume.id),
				},
			}),
		);

		const withinSegs = trimSlashes(withinPath || "")
			.split("/")
			.filter(Boolean)
			.map(trimSlashes);

		const now = new Date();

		const row = {
			ownerId: volume.ownerId,
			workspaceId: volume.workspaceId,
			volumeId: volume.id,
			type: "folder" as const,
			path: toVolumeRelativePath(withinSegs, name),
			name,
			sizeBytes: 0,
			mimeType: null as string | null,
			lastSyncedAt: now,
			updatedAt: now,
			metaData: {
				kind: "cloud",
				bucket,
				key,
				relativeKey,
				prefix: key,
				lastModified: now.toISOString(),
			},
		};

		await rls(async (tx) => {
			await tx
				.insert(driveEntries)
				.values([row])
				.onConflictDoUpdate({
					target: [
						driveEntries.ownerId,
						driveEntries.volumeId,
						driveEntries.path,
					],
					set: {
						type: driveEntries.type,
						name: driveEntries.name,
						sizeBytes: driveEntries.sizeBytes,
						mimeType: driveEntries.mimeType,
						metaData: driveEntries.metaData,
						lastSyncedAt: driveEntries.lastSyncedAt,
						updatedAt: driveEntries.updatedAt,
					},
				});
		});

		revalidatePath(
			"/[locale]/w/[wPublicId]/dashboard/drive/[[...segments]]",
			"page",
		);

		return {
			success: true,
			message: "drive.folderCreated",
		};
	});
}



function getVolumePrefix(volume: DriveVolumeEntity) {
	return `drive/workspaces/${volume.workspaceId}/${volume.code}/`;
}

export async function fetchCloudListPath(ctx: DriveRouteContext) {
	assertDriveEnabled();
	const volume = ctx.driveVolume;
	if (!volume) return [];

	const volumeId = volume.id;
	const bucket = String(volume.metaData?.bucket || "");

	if (!bucket) throw new Error("Missing bucket in volume metaData");

	const volumePrefix = getVolumePrefix(volume);

	const withinPrefix =
		ctx.withinPath && ctx.withinPath !== "/"
			? ctx.withinPath.replace(/^\/+/, "").replace(/\/?$/, "/")
			: "";

	const s3Prefix = `${volumePrefix}${withinPrefix}`;

	const prefixes: { Prefix?: string }[] = [];
	const contents: {
		Key?: string;
		Size?: number;
		ETag?: string;
		LastModified?: Date;
	}[] = [];

	let continuationToken: string | undefined;

	do {
		const res = await s3.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: s3Prefix,
				Delimiter: "/",
				MaxKeys: 200,
				ContinuationToken: continuationToken,
			}),
		);

		prefixes.push(...(res.CommonPrefixes ?? []));
		contents.push(...(res.Contents ?? []));

		if (res.IsTruncated && !res.NextContinuationToken) {
			throw new Error("Drive listing ended without a continuation token");
		}

		continuationToken = res.IsTruncated
			? res.NextContinuationToken
			: undefined;
	} while (continuationToken);

	const now = new Date();

	const rows = [
		// ...(res.CommonPrefixes ?? []).map((p) => {
		...prefixes.map((p) => {
			const key = String(p.Prefix || "").replace(/\/$/, "");
			const relativeKey = key.replace(volumePrefix, "");
			const name = relativeKey.split("/").filter(Boolean).pop() || relativeKey;

			return {
				ownerId: volume.ownerId,
				workspaceId: volume.workspaceId,
				volumeId,
				type: "folder" as const,
				path: `/${relativeKey}`,
				name,
				sizeBytes: 0,
				mimeType: null,
				lastSyncedAt: now,
				metaData: { bucket, key, relativeKey, prefix: p.Prefix },
				updatedAt: now,
			};
		}),

		// ...(res.Contents ?? [])
		...contents
			.filter((o) => o.Key && o.Key !== s3Prefix && !String(o.Key).endsWith("/"))
			.map((o) => {
				const key = String(o.Key);
				const relativeKey = key.replace(volumePrefix, "");
				const name = relativeKey.split("/").filter(Boolean).pop() || relativeKey;

				return {
					ownerId: volume.ownerId,
					workspaceId: volume.workspaceId,
					volumeId,
					type: "file" as const,
					path: `/${relativeKey}`,
					name,
					sizeBytes: Number(o.Size || 0),
					mimeType: null,
					lastSyncedAt: now,
					metaData: {
						bucket,
						key,
						relativeKey,
						etag: o.ETag,
						lastModified: o.LastModified?.toISOString(),
					},
					updatedAt: now,
				};
			}),
	];

	if (!rows.length) return [];

	const rls = await rlsClient();

	return rls((tx) =>
		tx
			.insert(driveEntries)
			.values(rows)
			.onConflictDoUpdate({
				target: [
					driveEntries.ownerId,
					driveEntries.volumeId,
					driveEntries.path,
				],
				set: {
					type: driveEntries.type,
					name: driveEntries.name,
					sizeBytes: driveEntries.sizeBytes,
					mimeType: driveEntries.mimeType,
					metaData: driveEntries.metaData,
					lastSyncedAt: driveEntries.lastSyncedAt,
					updatedAt: driveEntries.updatedAt,
				},
			})
			.returning(),
	);
}

function joinPaths(base: string, leaf: string) {
	const b = (base || "/").replace(/\/+$/g, "");
	const l = (leaf || "").replace(/^\/+/g, "");
	const out = `${b}/${l}`;
	return out === "" ? "/" : out;
}

export async function getCloudUploadUrl(
	ctx: DriveRouteContext,
	input: {
		filename: string;
		sizeBytes?: number;
		contentType?: string | null;
	}
) {
	assertDriveEnabled();

	const user = await isSignedIn();
	if (!user?.id) throw new Error("Not signed in");

	const publicId = ctx.driveVolume?.publicId;
	if (!publicId) throw new Error("Missing drive volume");

	const rls = await rlsClient();

	const [volume] = await rls((tx) =>
		tx
			.select()
			.from(driveVolumes)
			.where(eq(driveVolumes.publicId, publicId))
			.limit(1)
	);

	if (!volume || volume.ownerId !== String(user.id)) {
		throw new Error("Drive volume not found");
	}

	if (volume.kind !== "cloud") {
		throw new Error("Invalid volume type");
	}

	const bucket = String(volume.metaData?.bucket || "").trim();
	if (!bucket) throw new Error("Missing bucket in volume metadata");

	const filename = String(input.filename || "").trim();

	if (
		!filename ||
		filename === "." ||
		filename === ".." ||
		/[/\\\u0000-\u001f]/.test(filename)
	) {
		throw new Error("Invalid filename");
	}

	const withinSegments = String(ctx.withinPath || "/")
		.split("/")
		.filter(Boolean);

	if (
		withinSegments.some(
			(segment) =>
				segment === "." || segment === ".." || /[\\\u0000-\u001f]/.test(segment)
		)
	) {
		throw new Error("Invalid folder path");
	}

	const withinPath = `/${withinSegments.join("/")}`;
	const fullPath = joinPaths(withinPath, filename);
	const relativeKey = fullPath.replace(/^\/+/, "");
	const key = `${getVolumePrefix(volume)}${relativeKey}`;
	const uploadToken = crypto.randomUUID();

	await rls((tx) =>
		tx.insert(driveUploadIntents).values({
			volumeId: volume.id,
			token: uploadToken,
			targetPath: fullPath,
			singleUse: true,
			expiresAt: new Date(Date.now() + 5 * 60 * 1000),
		})
	);

	const contentType = input.contentType || "application/octet-stream";

	const url = await getSignedUrl(
		s3,
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			ContentType: contentType,
			Metadata: {
				ownerId: String(user.id),
				volumeId: String(volume.id),
			},
		}),
		{ expiresIn: 60 * 5 }
	);

	return {
		providerId: null,
		bucket,
		path: fullPath,
		key,
		relativeKey,
		method: "PUT",
		url,
		uploadToken,
		headers: {
			"Content-Type": contentType,
		},
	};
}



export async function getDriveDownloadUrl(entryId: string) {
	assertDriveEnabled();

	const rls = await rlsClient();
	const [entry] = await rls((tx) =>
		tx.select().from(driveEntries).where(eq(driveEntries.id, entryId)).limit(1),
	);
	if (!entry) throw new Error("Missing drive entry");
	const meta = entry.metaData as any;
	const bucket = String(meta?.bucket || "");
	const key = String(meta?.key || entry.path?.replace(/^\/+/, "") || "");
	if (!bucket || !key) throw new Error("Missing bucket or key");
	return getSignedUrl(
		s3,
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
			ResponseContentDisposition: `attachment; filename="${entry.name}"`,
		}),
		{ expiresIn: 60 * 5 },
	);

}

export async function deleteDriveEntry(entryId: string) {
	return handleAction(async () => {
		assertDriveEnabled();
		const rls = await rlsClient();

		const [entry] = await rls((tx) =>
			tx.select().from(driveEntries).where(eq(driveEntries.id, entryId)).limit(1),
		);

		if (!entry) throw new Error("Missing drive entry");

		const meta = entry.metaData as any;
		const bucket = String(meta?.bucket || "");
		const key = String(meta?.key || entry.path?.replace(/^\/+/, "") || "");

		if (!bucket || !key) throw new Error("Missing bucket or key");

		if (entry.type === "folder") {
			const prefix = key.endsWith("/") ? key : `${key}/`;

			let continuationToken: string | undefined;

			do {
				const listed = await s3.send(
					new ListObjectsV2Command({
						Bucket: bucket,
						Prefix: prefix,
						ContinuationToken: continuationToken,
					}),
				);

				const objects = (listed.Contents ?? [])
					.map((item) => item.Key)
					.filter(Boolean)
					.map((Key) => ({ Key: String(Key) }));

				if (objects.length) {
					await s3.send(
						new DeleteObjectsCommand({
							Bucket: bucket,
							Delete: {
								Objects: objects,
								Quiet: true,
							},
						}),
					);
				}

				continuationToken = listed.NextContinuationToken;
			} while (continuationToken);

			await rls((tx) =>
				tx
					.delete(driveEntries)
					.where(
						and(
							eq(driveEntries.volumeId, entry.volumeId),
							sql`${driveEntries.path} = ${entry.path} OR ${driveEntries.path} LIKE ${entry.path.replace(/\/$/, "") + "/%"}`,
						),
					),
			);

			revalidatePath(
				"/[locale]/w/[wPublicId]/dashboard/drive/[[...segments]]",
				"page",
			);

			return {
				success: true,
				message: "drive.deletedFolder",
			};
		}

		await s3.send(
			new DeleteObjectCommand({
				Bucket: bucket,
				Key: key,
			}),
		);

		await rls((tx) =>
			tx
				.delete(driveEntries)
				.where(
					and(
						eq(driveEntries.id, entry.id),
						eq(driveEntries.volumeId, entry.volumeId),
					),
				),
		);

		revalidatePath(
			"/[locale]/w/[wPublicId]/dashboard/drive/[[...segments]]",
			"page",
		);

		return {
			success: true,
			message: "drive.deletedFile",
		};
	});
}


export async function getDrivePreviewUrl(entryId: string) {
	assertDriveEnabled();

	const rls = await rlsClient();

	const [entry] = await rls((tx) =>
		tx.select().from(driveEntries).where(eq(driveEntries.id, entryId)).limit(1)
	);

	if (!entry || entry.type !== "file") {
		throw new Error("File not found");
	}

	const [volume] = await rls((tx) =>
		tx
			.select()
			.from(driveVolumes)
			.where(eq(driveVolumes.id, entry.volumeId))
			.limit(1)
	);

	if (!volume) {
		throw new Error("Volume not found");
	}

	const bucket = String(volume.metaData?.bucket || "");
	const key = `${getVolumePrefix(volume)}${trimSlashes(entry.path)}`;

	if (!bucket) {
		throw new Error("Missing bucket");
	}

	const object = await s3.send(
		new HeadObjectCommand({
			Bucket: bucket,
			Key: key,
		})
	);

	const mimeType = object.ContentType?.split(";")[0]?.trim().toLowerCase();

	if (
		!mimeType ||
		![
			"image/jpeg",
			"image/png",
			"image/webp",
			"image/gif",
			"application/pdf",
		].includes(mimeType)
	) {
		return null;
	}

	const url = await getSignedUrl(
		s3,
		new GetObjectCommand({
			Bucket: bucket,
			Key: key,
			ResponseContentType: mimeType,
			ResponseContentDisposition: "inline",
		}),
		{ expiresIn: 60 * 5 }
	);

	return { url, mimeType };
}


const shareDurations = {
	"1h": 60 * 60 * 1000,
	"1d": 24 * 60 * 60 * 1000,
	"7d": 7 * 24 * 60 * 60 * 1000,
} as const;

export type DriveShareDuration = keyof typeof shareDurations;

export async function createDriveShareLink(
	entryId: string,
	duration: DriveShareDuration,
) {
	assertDriveEnabled();

	const durationMs = shareDurations[duration];

	// Server actions can be called with arbitrary input.
	if (!durationMs) {
		throw new Error("Invalid share-link duration");
	}

	const token = randomBytes(32).toString("base64url");
	const tokenHash = createHash("sha256").update(token).digest("hex");
	const expiresAt = new Date(Date.now() + durationMs);
	const rls = await rlsClient();

	const link = await rls(async (tx) => {
		const [entry] = await tx
			.select({
				id: driveEntries.id,
				type: driveEntries.type,
				workspaceId: driveEntries.workspaceId,
			})
			.from(driveEntries)
			.where(eq(driveEntries.id, entryId))
			.limit(1);

		if (!entry || entry.type !== "file") {
			throw new Error("File not found");
		}

		const [created] = await tx
			.insert(driveShareLinks)
			.values({
				entryId: entry.id,
				workspaceId: entry.workspaceId,
				tokenHash,
				expiresAt,
			})
			.returning({
				id: driveShareLinks.id,
				expiresAt: driveShareLinks.expiresAt,
			});

		return created;
	});

	if (!link) {
		throw new Error("Could not create share link");
	}

	return {
		id: link.id,
		token,
		expiresAt: link.expiresAt.toISOString(),
	};
}

export async function listDriveShareLinks(entryId: string) {
	assertDriveEnabled();

	const rls = await rlsClient();

	return rls(async (tx) => {
		const [entry] = await tx
			.select({ id: driveEntries.id })
			.from(driveEntries)
			.where(eq(driveEntries.id, entryId))
			.limit(1);

		if (!entry) {
			throw new Error("File not found");
		}

		const links = await tx
			.select({
				id: driveShareLinks.id,
				createdAt: driveShareLinks.createdAt,
				expiresAt: driveShareLinks.expiresAt,
			})
			.from(driveShareLinks)
			.where(
				and(
					eq(driveShareLinks.entryId, entry.id),
					isNull(driveShareLinks.revokedAt),
					gt(driveShareLinks.expiresAt, new Date()),
				),
			)
			.orderBy(driveShareLinks.createdAt);

		return links.map((link) => ({
			id: link.id,
			createdAt: link.createdAt.toISOString(),
			expiresAt: link.expiresAt.toISOString(),
		}));
	});
}

export async function revokeDriveShareLink(
	entryId: string,
	linkId: string,
) {
	assertDriveEnabled();

	const rls = await rlsClient();

	return rls(async (tx) => {
		const [entry] = await tx
			.select({ id: driveEntries.id })
			.from(driveEntries)
			.where(eq(driveEntries.id, entryId))
			.limit(1);

		if (!entry) {
			throw new Error("File not found");
		}

		const [revoked] = await tx
			.update(driveShareLinks)
			.set({ revokedAt: new Date() })
			.where(
				and(
					eq(driveShareLinks.id, linkId),
					eq(driveShareLinks.entryId, entry.id),
					isNull(driveShareLinks.revokedAt),
				),
			)
			.returning({ id: driveShareLinks.id });

		if (!revoked) {
			throw new Error("Active share link not found");
		}

		return { id: revoked.id };
	});
}
