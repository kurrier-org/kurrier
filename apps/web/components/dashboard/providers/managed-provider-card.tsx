"use client";

import type { ProviderSpec } from "@schema";
import { Globe, Verified } from "lucide-react";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export default function ManagedProviderCard({
                                                    spec,
                                                }: {
    spec: ProviderSpec;
}) {
    const dict = useOptionalDictionary();

    const providerName =
        (dict?.platform as Record<string, string> | undefined)?.[
            `providerName${spec.key.charAt(0).toUpperCase()}${spec.key.slice(1)}`
            ] ?? spec.name;

    return (
        <Card className="shadow-none relative">
            <CardHeader className="gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <Globe className="mt-1 size-4 shrink-0 text-muted-foreground" />

                    <div className="min-w-0">
                        <CardTitle className="text-lg sm:text-xl">
                            {providerName}
                        </CardTitle>

                        <p className="text-sm text-muted-foreground my-2">
                            {dict?.platform?.managedSecurelyBackedByOwnAccount ??
                                "Storage is managed by Kurrier and backed by your configured storage infrastructure."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Verified size={16} />
                    <span>{dict?.platform?.verified ?? "Verified"}</span>
                </div>
            </CardHeader>
        </Card>
    );
}
