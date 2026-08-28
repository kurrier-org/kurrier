import { cookies } from "next/headers";
import Link from "next/link";
import DriveEntry from "@/components/dashboard/drive/drive-entry";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import {
	fetchCloudListPath,
	fetchVolumes,
	normalizeWithinPath,
} from "@/lib/actions/drive";
import { getDictionary } from "@/lib/dictionaries";

export default async function Page({
	params,
}: {
	params: Promise<{ segments?: string[] }>;
}) {
	const { segments } = await params;
	const cookieStore = await cookies();
	const dict = await getDictionary(cookieStore.get("locale")?.value ?? "en");
	const ctx = await normalizeWithinPath(segments ?? []);
	const workspacePublicId = await getWorkspacePublicId();

	if (!ctx.driveVolume) {
		const volumes = await fetchVolumes();

		return (
			<div className="p-4 sm:p-6 lg:p-8">
				<div className="mb-6">
					<h1 className="text-xl font-semibold text-foreground">
						{dict.drive.drive}
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{dict.drive.chooseAVolume}
					</p>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{volumes.map((volume) => (
						<Link
							key={volume.id}
							href={`/w/${workspacePublicId}/dashboard/drive/volumes/${volume.publicId}`}
							className="rounded-xl border bg-card p-5 transition hover:bg-muted/40"
						>
							<div className="font-semibold text-foreground">
								{volume.label}
							</div>
							<div className="mt-1 text-xs uppercase text-muted-foreground">
								{volume.kind}
							</div>
						</Link>
					))}
				</div>
			</div>
		);
	}

	const entries = await fetchCloudListPath(ctx);

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{entries.map((e) => (
					<DriveEntry key={e.id} entry={e} />
				))}
			</div>
		</div>
	);
}
