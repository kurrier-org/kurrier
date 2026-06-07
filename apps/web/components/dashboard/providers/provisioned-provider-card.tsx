"use client";
import { ProviderSpec } from "@schema";
import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {Globe, Verified} from "lucide-react";
import * as React from "react";
import {
    FetchDecryptedSecretsResult,
    SyncProvidersRow,
} from "@/lib/actions/dashboard";

export default function ProvisionedProviderCard({
                                         spec,
                                     }: {
    spec: ProviderSpec;
    userProvider: SyncProvidersRow;
    decryptedSecret: FetchDecryptedSecretsResult[number];
}) {

    return (
        <div>
            <Card className="shadow-none relative">
                <CardHeader className="gap-3">
                    <div className="flex flex-col gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <Globe className="mt-1 size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                                <CardTitle className="text-lg sm:text-xl">
                                    {spec.name}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground my-2">
                                    Managed securely in a secure Vault. Backed by your own account.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2"></div>
                    </div>
                    <div className={"flex items-center gap-1"}>
                        <Verified size={16} />
                        <span>Verified</span>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
}
