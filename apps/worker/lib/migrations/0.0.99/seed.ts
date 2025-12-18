import { $fetch } from "ofetch";
import { getRedis } from "../../../lib/get-redis";

async function ensureCollection(path: string) {
	const url = process.env.WEB_DAV_URL + path;
	try {
		await $fetch.raw(url, {
			method: "MKCOL",
		});
		console.log("[DAV DRIVE] Created collection:", path);
	} catch (err: any) {
		const status =
			err?.response?.status ?? err?.statusCode ?? err?.status ?? null;

		if (status === 405 || status === 409) {
			console.log("[DAV DRIVE] Collection already exists:", path);
			return;
		}

		console.error(
			"[DAV DRIVE] MKCOL failed for",
			path,
			status,
			err?.message ?? err,
		);
		throw err;
	}
}

const seedDefaultUserDavFolder = async (userId: string) => {
	await ensureCollection("/users/");
	const userFolderPath = `/users/${userId}/`;
	await ensureCollection(userFolderPath);
};

export default async function seed({ userId }: { userId: string }) {
	await seedDefaultUserDavFolder(userId);
	const { commonWorkerQueue, commonWorkerEvents } = await getRedis();
	const job = await commonWorkerQueue.add("sync-providers", { userId });
	await job.waitUntilFinished(commonWorkerEvents);

	console.info("Migration 0.0.99 - seed.ts executed");
}
