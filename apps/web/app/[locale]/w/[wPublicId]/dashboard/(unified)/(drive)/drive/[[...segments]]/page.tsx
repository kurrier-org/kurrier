import { ArrowRight, FolderOpen, HardDrive, Settings2 } from "lucide-react";
import Link from "next/link";
import DashboardEmptyState from "@/components/dashboard/dashboard-empty-state";
import DriveEntry from "@/components/dashboard/drive/drive-entry";
import NewUploadButton from "@/components/dashboard/drive/new-upload-button";
import { Button } from "@/components/ui/button";
import { getWorkspacePublicId } from "@/lib/actions/clients";
import {
	fetchCloudListPath,
	fetchVolumes,
	normalizeWithinPath,
} from "@/lib/actions/drive";
import { getDictionary, type Locale } from "@/lib/dictionaries";

export default async function Page({
	params,
}: {
	params: Promise<{ locale: Locale; segments?: string[] }>;
}) {
	const { locale, segments } = await params;
	const dict = await getDictionary(locale);
	const ctx = await normalizeWithinPath(segments ?? []);
	const workspacePublicId = await getWorkspacePublicId();

	if (!ctx.driveVolume) {
		const volumes = await fetchVolumes();
		const storageHref = `/w/${workspacePublicId}/dashboard/platform/storage`;

		if (volumes.length === 0) {
			return (
				<DashboardEmptyState
					className="min-h-[calc(100svh-4rem)]"
					icon={<HardDrive className="size-5" aria-hidden="true" />}
					title={dict.drive.emptyVolumesTitle ?? "No storage volumes yet"}
					description={
						dict.drive.emptyVolumesDescription ??
						"Configure a storage volume to start using Drive."
					}
					action={
						<Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
							<Link href={storageHref}>
								<Settings2 className="size-4" aria-hidden="true" />
								{dict.drive.configureStorage ?? "Configure storage"}
							</Link>
						</Button>
					}
				/>
			);
		}

		return (
			<div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
				<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-xl font-semibold text-foreground">
							{dict.drive.storageVolumes ?? "Storage volumes"}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{dict.drive.chooseAVolume ??
								"Choose a volume to browse its files."}
						</p>
					</div>
					<Button asChild variant="outline" className="w-full sm:w-auto">
						<Link href={storageHref}>
							<Settings2 className="size-4" aria-hidden="true" />
							{dict.drive.manageStorage ?? "Manage storage"}
						</Link>
					</Button>
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{volumes.map((volume) => (
						<Link
							key={volume.id}
							href={`/w/${workspacePublicId}/dashboard/drive/volumes/${volume.publicId}`}
							className="group flex min-w-0 items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
								<HardDrive className="size-5" aria-hidden="true" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="truncate font-semibold text-foreground">
									{volume.label}
								</div>
								<div className="mt-0.5 text-xs text-muted-foreground">
									{dict.drive.cloudStorage ?? "Cloud storage"}
								</div>
							</div>
							<ArrowRight
								className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
								aria-hidden="true"
							/>
						</Link>
					))}
				</div>
			</div>
		);
	}

	let entries: Awaited<ReturnType<typeof fetchCloudListPath>>;

	try {
		entries = await fetchCloudListPath(ctx);
	} catch (error) {
		console.error("Failed to load Drive volume", error);

		return (
			<DashboardEmptyState
				className="min-h-[calc(100svh-4rem)]"
				icon={<HardDrive className="size-5" aria-hidden="true" />}
				title={dict.drive.storageUnavailableTitle ?? "Storage unavailable"}
				description={
					dict.drive.storageUnavailableDescription ??
					"Drive could not connect to this storage volume. Check its settings and try again."
				}
				action={
					<Button
						asChild
						variant="outline"
						className="h-11 w-full sm:h-9 sm:w-auto"
					>
						<Link href={`/w/${workspacePublicId}/dashboard/platform/storage`}>
							<Settings2 className="size-4" aria-hidden="true" />
							{dict.drive.checkStorageSettings ?? "Check storage settings"}
						</Link>
					</Button>
				}
			/>
		);
	}

	if (entries.length === 0) {
		return (
			<DashboardEmptyState
				className="min-h-[calc(100svh-4rem)]"
				icon={<FolderOpen className="size-5" aria-hidden="true" />}
				title={dict.drive.emptyFolderTitle ?? "This folder is empty"}
				description={
					dict.drive.emptyFolderDescription ??
					"Upload a file or create a folder to get started."
				}
				action={<NewUploadButton className="h-11 w-full sm:h-9 sm:w-auto" />}
			/>
		);
	}

	return (
		<div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
			<div className="mb-4 flex items-center justify-between gap-3">
				<p className="text-sm font-medium text-muted-foreground">
					{(dict.drive.itemsCount ?? "{count} items").replace(
						"{count}",
						String(entries.length),
					)}
				</p>
				<NewUploadButton className="hidden sm:inline-flex md:hidden" />
			</div>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
				{entries.map((e) => (
					<DriveEntry key={e.id} entry={e} />
				))}
			</div>
		</div>
	);
}
