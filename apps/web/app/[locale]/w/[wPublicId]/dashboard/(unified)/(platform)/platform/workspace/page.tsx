import { Suspense } from "react";
import { DashboardContentLoading } from "@/components/dashboard/dashboard-loading";
import WorkspacesGeneral from "@/components/dashboard/workspaces/workspaces-general";

export default function Page() {
	return (
		<Suspense fallback={<DashboardContentLoading />}>
			<WorkspacesGeneral />
		</Suspense>
	);
}
