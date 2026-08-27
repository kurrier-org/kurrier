import React, { Suspense } from "react";
import Loading from "@/app/loading";
import WorkspacesGeneral from "@/components/dashboard/workspaces/workspaces-general";

export default function Page() {
    return (
        <Suspense fallback={<Loading />}>
            <WorkspacesGeneral />
        </Suspense>
    );
}
