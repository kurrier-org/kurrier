export type MicrosoftOAuthCleanup = {
	resource: string;
	cleanup: () => Promise<void>;
};

export async function compensateMicrosoftOAuthResources(
	correlationId: string,
	resources: MicrosoftOAuthCleanup[],
	log: (entry: {
		correlationId: string;
		resource: string;
		error: string;
	}) => void = (entry) =>
		console.error("[MICROSOFT OAUTH CLEANUP FAILED]", entry),
) {
	for (const { resource, cleanup } of resources) {
		try {
			await cleanup();
		} catch (error) {
			log({
				correlationId,
				resource,
				error: error instanceof Error ? error.message : "unknown cleanup error",
			});
		}
	}
}
