import * as React from "react";
import { Container } from "@/components/common/containers";
import {ProviderLabels, STORAGE_PROVIDERS} from "@schema";
import {fetchDecryptedSecrets, getProviderById, syncProviders} from "@/lib/actions/dashboard";
import ProviderCardShell from "@/components/dashboard/providers/provider-card-shell";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import VolumesManager from "@/components/dashboard/storage/volumes-manager";
import {rlsClient} from "@/lib/actions/clients";
import {driveVolumes, providerSecrets, smtpAccountSecrets} from "@db";
import {parseSecret} from "@/lib/utils";

export default async function ProvidersPage() {
    const userProviders = await syncProviders();
    const rls = await rlsClient();
    const vols = await rls((tx) =>
        tx
            .select()
            .from(driveVolumes)
    );
    const [, userProviderAccounts] = await Promise.all([
        fetchDecryptedSecrets({
            linkTable: smtpAccountSecrets,
            foreignCol: smtpAccountSecrets.accountId,
            secretIdCol: smtpAccountSecrets.secretId,
        }),
        fetchDecryptedSecrets({
            linkTable: providerSecrets,
            foreignCol: providerSecrets.providerId,
            secretIdCol: providerSecrets.secretId,
        }),
    ]);

    const options = [];
    for (const providerAccount of userProviderAccounts) {
        const secret = parseSecret(providerAccount);
        if (secret.verified) {
            const provider = await getProviderById(
                String(providerAccount.linkRow.providerId),
            );
            const providerName =
                ProviderLabels[provider?.type || "unknown"] || "Unknown Provider";
            if (provider) {
                options.push({
                    label: providerName,
                    value: String(providerAccount.providerId),
                });
            }
        }
    }

    return (
        <>
            <header className="flex h-16 shrink-0 items-center gap-2">
                <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                        orientation="vertical"
                        className="mr-2 data-[orientation=vertical]:h-4"
                    />
                </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <Container variant="wide">
                    <div className="flex items-center justify-between my-4">
                        <h1 className="text-xl font-bold text-foreground">Storage Providers</h1>
                    </div>

                    <p className="max-w-prose text-sm text-muted-foreground my-6">
                        Connect storage providers directly from the dashboard - no manual
                        environment setup required.
                    </p>

                    <div className="grid gap-6 lg:grid-cols-2">
                        {STORAGE_PROVIDERS.map((p) => (
                            <ProviderCardShell
                                key={p.key}
                                spec={p}
                                userProviders={userProviders}
                            />
                        ))}
                    </div>
                </Container>
                <div className={"mx-1"}>
                    <VolumesManager userProviders={userProviders} volumes={vols} providerSelectOptions={options} />
                </div>
            </div>


        </>
    );
}
