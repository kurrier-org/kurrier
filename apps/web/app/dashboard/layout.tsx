import { isSignedIn } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import {getRedis} from "@/lib/actions/get-redis";
import {APP_VERSION} from "@/lib/constants";

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await isSignedIn();

	if (!user) {
		redirect("/auth/login");
	}

    const {migrationWorkerQueue, migrationWorkerEvents} = await getRedis()
    const job = await migrationWorkerQueue.add("migration:run-for-user", {
        toVersion: APP_VERSION,
        userId: user?.id,
    }, {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 3000
        },
        removeOnComplete: { age: 60 },
        removeOnFail: false,
        jobId: `migration:${user?.id}:${APP_VERSION}`,
    });
    await job.waitUntilFinished(migrationWorkerEvents);

	return children;
}
