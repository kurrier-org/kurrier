import KurrierLogo from "@/components/common/kurrier-logo";
import { fetchWorkspace } from "@/lib/actions/workspace";

export default async function WorkspaceLogo() {
    const workspace = await fetchWorkspace();

    return (
        <div className="flex min-w-0 items-center gap-2">
            {workspace.logoKey ? (
                <img
                    src={`/api/workspaces/${encodeURIComponent(workspace.publicId)}/logo?v=${encodeURIComponent(workspace.logoKey.split("/").at(-1) ?? "")}`}
                    alt=""
                    className="size-9 shrink-0 rounded-lg object-contain"
                />
            ) : (
                <KurrierLogo size={36} />
            )}
            <span className="truncate text-lg font-semibold">
                {workspace.name}
            </span>
        </div>
    );
}
