import Link from "next/link";
import * as React from "react";

import KurrierLogo from "@/components/common/kurrier-logo";
import { DISTRIBUTION_CONFIG } from "@distribution/config";

export async function RootPage() {
    const locale = DISTRIBUTION_CONFIG.defaultLocale;

    return (
        <div className="bg-muted flex min-h-svh items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center rounded-xl border bg-background p-8 shadow-sm">
                    <div className="mb-6 flex items-center gap-3">
                        <KurrierLogo size={52} />
                        <span className="text-3xl font-semibold tracking-tight">
							Kurrier
						</span>
                    </div>

                    <div className="mb-8 text-center">
                        <h1 className="text-xl font-semibold">
                            Welcome to Kurrier
                        </h1>

                        <p className="text-muted-foreground mt-2 text-sm">
                            Your open source email workspace.
                        </p>
                    </div>

                    <div className="flex w-full flex-col gap-3">
                        <Link
                            href={`/${locale}/auth/login`}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors"
                        >
                            Log in
                        </Link>

                        <Link
                            href={`/${locale}/auth/signup`}
                            className="hover:bg-accent hover:text-accent-foreground flex h-10 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium transition-colors"
                        >
                            Create an account
                        </Link>
                    </div>
                </div>

                <p className="text-muted-foreground mt-6 text-center text-xs">
                    Open source email, calendar, contacts and files.
                </p>
            </div>
        </div>
    );
}
