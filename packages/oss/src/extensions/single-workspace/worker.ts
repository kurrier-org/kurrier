import type { KurrierExtension } from "@extensions";

export const singleWorkspaceWorkerExtension = {
    manifest: {
        id: "oss.single-workspace",
        name: "Single Workspace",
    },

    contributions: {
        workers: [
            {
                queue: "oss-example",
                handler: async (job) => {
                    console.info("[OSS WORKER]", job.name, job.data);

                    return { success: true };
                },
            },
        ],
    },
} satisfies KurrierExtension;
