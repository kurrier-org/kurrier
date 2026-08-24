import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

import ManageVault from "@/components/dashboard/vault/manage-vault";

import {
    createVaultSecret,
    deleteVaultSecret,
    fetchVaultSecrets,
    revealVaultSecret,
    updateVaultSecret,
} from "@/lib/actions/vault";

export default async function Page() {
    const secrets = await fetchVaultSecrets();

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
                <ManageVault
                    secrets={secrets}
                    createSecret={createVaultSecret}
                    updateSecret={updateVaultSecret}
                    deleteSecret={deleteVaultSecret}
                    revealSecret={revealVaultSecret}
                />
            </div>
        </>
    );
}
