"use server";

import { isSignedIn } from "@/lib/actions/auth";
import {
	driveEntries, DriveVolumeEntity,
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
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand
} from "@aws-sdk/client-s3";
import {s3} from "@/lib/create-s3-client";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";


const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");

export const normalizeWithinPath = async (segments: string[]) => {
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
		const decodedForm = decode(formData) as Record<string, unknown>;

		const name =
			typeof decodedForm.name === "string" ? decodedForm.name.trim() : "";

		if (!name) {
			return { success: false, error: "Folder name is required" };
		}

		const withinPath = await normalizeWithinPathString(decodedForm.path);

		const publicId =
			typeof decodedForm.publicId === "string" && decodedForm.publicId.trim()
				? decodedForm.publicId.trim()
				: undefined;

		if (!publicId) {
			return { success: false, error: "Missing volume" };
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
			return { success: false, error: "Volume not found" };
		}

		if (volume.kind !== "cloud") {
			return { success: false, error: "Invalid volume type" };
		}

		const bucket = String(volume.metaData?.bucket || "").trim();

		if (!bucket) {
			return { success: false, error: "Cloud volume missing bucket" };
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

		revalidatePath("/w/[workspaceId]/dashboard/drive");

		return {
			success: true,
			message: "Folder created",
		};
	});
}



export const refreshViewAfterUpload = async () => {
	return revalidatePath("/w/[workspaceId]/dashboard/drive");
};

function getVolumePrefix(volume: DriveVolumeEntity) {
	return `drive/workspaces/${volume.workspaceId}/${volume.code}/`;
}

export async function fetchCloudListPath(ctx: DriveRouteContext) {
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

	const res = await s3.send(
		new ListObjectsV2Command({
			Bucket: bucket,
			Prefix: s3Prefix,
			Delimiter: "/",
			MaxKeys: 200,
		}),
	);

	const now = new Date();

	const rows = [
		...(res.CommonPrefixes ?? []).map((p) => {
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

		...(res.Contents ?? [])
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
	},
) {
	const volume = ctx.driveVolume;
	if (!volume) throw new Error("Missing driveVolume");

	const user = await isSignedIn();
	const ownerId = String(user?.id || "");
	if (!ownerId) throw new Error("Not signed in");

	const bucket = String(volume.metaData?.bucket || "");
	if (!bucket) throw new Error("Missing bucket in volume metaData");

	const withinPath = String(ctx.withinPath || "/");
	const filename = String(input.filename || "").trim();
	if (!filename) throw new Error("Missing filename");

	const volumePrefix = getVolumePrefix(volume);
	const fullPath = joinPaths(withinPath, filename);
	const relativeKey = fullPath.replace(/^\/+/, "");
	const key = `${volumePrefix}${relativeKey}`;

	const url = await getSignedUrl(
		s3,
		new PutObjectCommand({
			Bucket: bucket,
			Key: key,
			ContentType: input.contentType || "application/octet-stream",
			Metadata: {
				ownerId,
				volumeId: String(volume.id),
			},
		}),
		{ expiresIn: 60 * 5 },
	);

	return {
		providerId: null,
		bucket,
		path: fullPath,
		key,
		relativeKey,
		method: "PUT",
		url,
		headers: {
			"Content-Type": input.contentType || "application/octet-stream",
		},
	};
}


export async function getDriveDownloadUrl(entryId: string) {

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

			revalidatePath("/w/[workspaceId]/dashboard/drive");

			return {
				success: true,
				message: "Deleted folder",
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

		revalidatePath("/w/[workspaceId]/dashboard/drive");

		return {
			success: true,
			message: "Deleted file",
		};
	});
}
