import { db, driveEntries, driveVolumes } from "@db";
import { and, eq, like, or } from "drizzle-orm";

const trimSlashes = (s: string) => s.replace(/^\/+|\/+$/g, "");
const stripQueryHash = (s: string) =>
	(s.split("?")[0] ?? "").split("#")[0] ?? s;

const toHomeRelativePath = (ownerId: string, href: string) => {
	const clean = decodeURI(stripQueryHash(href));
	const base = `/users/${ownerId}`;
	const prefix = `${base}/`;

	if (clean === base || clean === prefix) return "/";
	if (!clean.startsWith(prefix))
		throw new Error("deletePath: href outside home");

	const rel = clean.slice(prefix.length);
	const out = "/" + trimSlashes(rel);
	return out === "/" ? "/" : out;
};

export const deletePath = async (opts: {
	ownerId: string;
	volumeId: string;
	href: string;
}) => {
	const ownerId = String(opts.ownerId || "").trim();
	const volumeId = String(opts.volumeId || "").trim();
	const href = String(opts.href || "").trim();

	if (!ownerId) throw new Error("deletePath: missing ownerId");
	if (!volumeId) throw new Error("deletePath: missing volumeId");
	if (!href.startsWith("/")) throw new Error("deletePath: invalid href");

	const [vol] = await db
		.select()
		.from(driveVolumes)
		.where(
			and(eq(driveVolumes.id, volumeId), eq(driveVolumes.ownerId, ownerId)),
		)
		.limit(1);

	if (!vol) throw new Error("deletePath: volume not found");
	if (vol.kind !== "local" || vol.code !== "home") {
		throw new Error("deletePath: only home volume supported");
	}

	const targetPath = toHomeRelativePath(ownerId, href);

	const davUrl = new URL(href, process.env.WEB_DAV_URL).toString();
	const davRes = await fetch(davUrl, { method: "DELETE" });

	if (!davRes.ok && davRes.status !== 404) {
		const body = await davRes.text().catch(() => "");
		throw new Error(
			`WebDAV DELETE failed: ${davRes.status} ${davRes.statusText}\n${body}`,
		);
	}

	await db
		.delete(driveEntries)
		.where(
			and(
				eq(driveEntries.ownerId, ownerId),
				eq(driveEntries.volumeId, volumeId),
				or(
					eq(driveEntries.path, targetPath),
					like(driveEntries.path, `${targetPath === "/" ? "" : targetPath}/%`),
				),
			),
		);
};
