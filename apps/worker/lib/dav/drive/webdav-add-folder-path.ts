import { db, driveEntries, driveVolumes } from "@db";
import { and, eq } from "drizzle-orm";

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");
const ensureTrailingSlash = (p: string) => (p.endsWith("/") ? p : `${p}/`);

const joinUrlPath = (a: string, b: string) => {
	const left = a.endsWith("/") ? a.slice(0, -1) : a;
	const right = b.startsWith("/") ? b.slice(1) : b;
	return `${left}/${right}`;
};

const toVolumeRelativePath = (
	withinVolumeSegments: string[],
	nameOrFolder: string,
) => {
	const base = withinVolumeSegments.filter(Boolean).map(trimSlashes).join("/");
	const full = base ? `${base}/${nameOrFolder}` : nameOrFolder;
	return `/${trimSlashes(full)}`;
};

const ensureHomeVolume = async (ownerId: string) => {
	const basePath = `/users/${ownerId}`;

	const [existing] = await db
		.select()
		.from(driveVolumes)
		.where(
			and(eq(driveVolumes.ownerId, ownerId), eq(driveVolumes.code, "home")),
		)
		.limit(1);

	if (existing) {
		if (existing.basePath !== basePath) {
			await db
				.update(driveVolumes)
				.set({ basePath, updatedAt: new Date() })
				.where(eq(driveVolumes.id, existing.id));

			const [fresh] = await db
				.select()
				.from(driveVolumes)
				.where(eq(driveVolumes.id, existing.id))
				.limit(1);

			return fresh ?? existing;
		}
		return existing;
	}

	await db.insert(driveVolumes).values({
		ownerId,
		kind: "local",
		code: "home",
		label: "Home",
		basePath,
	});

	const [created] = await db
		.select()
		.from(driveVolumes)
		.where(
			and(eq(driveVolumes.ownerId, ownerId), eq(driveVolumes.code, "home")),
		)
		.limit(1);

	if (!created) throw new Error("addFolderPath: failed to create home volume");
	return created;
};

export const addFolderPath = async (opts: {
	ownerId: string;
	withinPath?: string;
	name: string;
}) => {
	const ownerId = opts.ownerId;
	const folderName = (opts.name ?? "").trim();

	if (!folderName) throw new Error("addFolderPath: missing folder name");
	if (folderName.includes("/") || folderName === "." || folderName === "..") {
		throw new Error("addFolderPath: invalid folder name");
	}

	const within = trimSlashes(opts.withinPath ?? "")
		.split("/")
		.filter(Boolean)
		.map(trimSlashes);

	const volume = await ensureHomeVolume(ownerId);

	const davBase = ensureTrailingSlash(volume.basePath ?? `/users/${ownerId}`);
	const parentDavPath = ensureTrailingSlash(
		within.length ? joinUrlPath(davBase, within.join("/")) : davBase,
	);
	const folderDavPath = ensureTrailingSlash(
		joinUrlPath(parentDavPath, folderName),
	);

	const url = new URL(folderDavPath, process.env.WEB_DAV_URL).toString();

	const res = await fetch(url, { method: "MKCOL" });
	if (!(res.status === 201 || res.status === 405)) {
		const body = await res.text().catch(() => "");
		throw new Error(
			`WebDAV MKCOL ${folderDavPath} failed: ${res.status} ${res.statusText}\n${body}`,
		);
	}

	const now = new Date();

	const upsert = {
		ownerId,
		volumeId: volume.id,
		type: "folder" as const,
		path: toVolumeRelativePath(within, folderName),
		name: folderName,
		sizeBytes: 0,
		mimeType: null as string | null,
		updatedAt: now,
		metaData: {
			href: folderDavPath,
			lastModified: now.toISOString(),
			davPath: parentDavPath,
			volumeCode: "home",
		},
	};

	await db
		.insert(driveEntries)
		.values([upsert])
		.onConflictDoUpdate({
			target: [driveEntries.ownerId, driveEntries.volumeId, driveEntries.path],
			set: {
				type: driveEntries.type,
				name: driveEntries.name,
				sizeBytes: driveEntries.sizeBytes,
				mimeType: driveEntries.mimeType,
				metaData: driveEntries.metaData,
				updatedAt: driveEntries.updatedAt,
			},
		});

	const [row] = await db
		.select()
		.from(driveEntries)
		.where(
			and(
				eq(driveEntries.ownerId, ownerId),
				eq(driveEntries.volumeId, volume.id),
				eq(driveEntries.path, upsert.path),
			),
		)
		.limit(1);

	return row ?? upsert;
};
