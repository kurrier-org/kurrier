import {fetchListPath} from "@/lib/actions/drive";
import DriveEntry from "@/components/dashboard/drive/drive-entry";


export default async function Page({ params }: { params: Promise<{ segments: string[] }> }) {
    const { segments } = await params;

    const segs = segments ?? [];
    const isVolume = segs[0] === "volumes" && !!segs[1];
    const publicId = isVolume ? segs[1] : undefined;
    const path = isVolume ? segs.slice(2) : segs;

    const entries = await fetchListPath(path, isVolume, publicId);

    return (
        <div className="p-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {entries.map((e: any) => (
                    <DriveEntry key={e.id} entry={e} />
                ))}
            </div>
        </div>
    );
}
