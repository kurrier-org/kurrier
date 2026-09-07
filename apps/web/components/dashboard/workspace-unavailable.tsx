export function WorkspaceUnavailable({
                                         reason,
                                     }: {
    reason?: string | null;
}) {
    return (
        <div className="flex min-h-screen items-center justify-center px-6">
            <div className="max-w-md text-center">
                <h1 className="text-xl font-semibold">
                    Workspace unavailable
                </h1>

                <p className="mt-2 text-sm text-muted-foreground">
                    {reason ??
                        "This workspace is currently unavailable."}
                </p>
            </div>
        </div>
    );
}
