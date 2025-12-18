import { db, driveEntries, driveVolumes } from "@db";
import { and, eq, inArray } from "drizzle-orm";
import { XMLParser } from "fast-xml-parser";

const davParser = new XMLParser({
	ignoreAttributes: false,
	ignoreDeclaration: true,
	attributeNamePrefix: "",
	removeNSPrefix: true,
});

const toArray = <T>(v: T | T[] | undefined | null): T[] => {
	if (!v) return [];
	return Array.isArray(v) ? v : [v];
};

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");
const ensureTrailingSlash = (p: string) => (p.endsWith("/") ? p : `${p}/`);

const joinUrlPath = (a: string, b: string) => {
	const left = a.endsWith("/") ? a.slice(0, -1) : a;
	const right = b.startsWith("/") ? b.slice(1) : b;
	return `${left}/${right}`;
};

const toVolumeRelativePath = (
	withinSegments: string[],
	nameOrFolder: string,
) => {
	const base = withinSegments.filter(Boolean).map(trimSlashes).join("/");
	const full = base ? `${base}/${nameOrFolder}` : nameOrFolder;
	return `/${trimSlashes(full)}`;
};

const normalizeHrefPath = (href: string) => trimSlashes(decodeURI(href));

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

	if (!created) throw new Error("webdavListPath: failed to create home volume");
	return created;
};

export const webdavListPath = async (opts: {
	ownerId: string;
	segments: string[];
}) => {
	const ownerId = opts.ownerId;
	const within = (opts.segments ?? []).filter(Boolean).map(trimSlashes);

	const volume = await ensureHomeVolume(ownerId);
	const davBase = ensureTrailingSlash(
		String(volume.basePath ?? `/users/${ownerId}`),
	);
	const davPath = ensureTrailingSlash(
		within.length ? joinUrlPath(davBase, within.join("/")) : davBase,
	);

	const url = new URL(davPath, process.env.WEB_DAV_URL).toString();
	const res = await fetch(url, { method: "PROPFIND", headers: { Depth: "1" } });

	if (!res.ok) {
		const body = await res.text().catch(() => "");
		throw new Error(
			`WebDAV PROPFIND ${davPath} failed: ${res.status} ${res.statusText}\n${body}`,
		);
	}

	const xml = await res.text();
	const json = davParser.parse(xml);

	const responsesRaw =
		json?.multistatus?.response ??
		json?.["D:multistatus"]?.["D:response"] ??
		[];

	const responses = toArray(responsesRaw);
	const requestedHrefNorm = normalizeHrefPath(new URL(url).pathname);

	const now = new Date();
	const upserts: {
		ownerId: string;
		volumeId: string;
		type: "file" | "folder";
		path: string;
		name: string;
		sizeBytes: number;
		mimeType: string | null;
		metaData: Record<string, any> | null;
		updatedAt: Date;
	}[] = [];

	for (const resp of responses) {
		const href: string | undefined = resp?.href ?? resp?.["D:href"];
		if (!href) continue;

		const hrefNorm = normalizeHrefPath(href);
		if (hrefNorm === requestedHrefNorm) continue;

		const propstat = resp?.propstat ?? resp?.["D:propstat"];
		const propstat0 = Array.isArray(propstat) ? propstat[0] : propstat;
		const prop = propstat0?.prop ?? propstat0?.["D:prop"];

		const rt = prop?.resourcetype ?? prop?.["D:resourcetype"];
		const isCollection =
			!!rt &&
			(rt?.collection !== undefined ||
				rt?.["D:collection"] !== undefined ||
				(Array.isArray(rt) &&
					rt.some(
						(x: any) =>
							x?.collection !== undefined || x?.["D:collection"] !== undefined,
					)));

		const displayNameRaw: string | undefined =
			prop?.displayname ?? prop?.["D:displayname"];
		const hrefLeaf = hrefNorm.split("/").filter(Boolean).pop() ?? "";
		const name = (displayNameRaw && displayNameRaw.trim()) || hrefLeaf;
		if (!name) continue;

		const sizeRaw = prop?.getcontentlength ?? prop?.["D:getcontentlength"];
		const parsedSize =
			typeof sizeRaw === "number"
				? sizeRaw
				: typeof sizeRaw === "string" && sizeRaw.trim() !== ""
					? Number(sizeRaw)
					: 0;

		const mimeType: string | null =
			(prop?.getcontenttype ?? prop?.["D:getcontenttype"] ?? null) || null;

		const lastModified: string | null =
			(prop?.getlastmodified ?? prop?.["D:getlastmodified"] ?? null) || null;

		const entryPath = toVolumeRelativePath(within, name);

		upserts.push({
			ownerId,
			volumeId: volume.id,
			type: isCollection ? "folder" : "file",
			path: entryPath,
			name,
			sizeBytes: isCollection
				? 0
				: Number.isFinite(parsedSize)
					? parsedSize
					: 0,
			mimeType: isCollection ? null : mimeType,
			updatedAt: now,
			metaData: {
				href,
				lastModified,
				davPath,
				volumeCode: "home",
			},
		});
	}

	if (!upserts.length) return [];

	await db
		.insert(driveEntries)
		.values(upserts)
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

	const paths = upserts.map((u) => u.path);

	const rows = await db
		.select()
		.from(driveEntries)
		.where(
			and(
				eq(driveEntries.ownerId, ownerId),
				eq(driveEntries.volumeId, volume.id),
				inArray(driveEntries.path, paths),
			),
		);

	return rows.sort((a, b) =>
		a.type === b.type
			? a.name.localeCompare(b.name)
			: a.type === "folder"
				? -1
				: 1,
	);
};
