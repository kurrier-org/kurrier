"use server";

import {
    createSecret,
    deleteSecret,
    getUserManagedSecret,
    listUserManagedSecrets,
    updateSecret,
} from "@db";

import { currentSession } from "@/lib/actions/auth";
import { getWorkspaceId } from "@/lib/actions/clients";
import { revalidatePath } from "next/cache";

const VAULT_PATH = "/w/[workspaceId]/dashboard/platform/vault";

export async function fetchVaultSecrets() {
    const session = await currentSession();
    const workspaceId = await getWorkspaceId();

    const rows = await listUserManagedSecrets(session, workspaceId);

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        keyVersion: row.keyVersion,
    }));
}

export type FetchVaultSecretsResult = Awaited<
    ReturnType<typeof fetchVaultSecrets>
>;

export async function revealVaultSecret(id: string) {
    const session = await currentSession();
    const workspaceId = await getWorkspaceId();

    const { vault } = await getUserManagedSecret(
        session,
        id,
        workspaceId,
    );

    return {
        value: vault.decrypted_secret,
    };
}

export async function createVaultSecret(formData: FormData) {
    const session = await currentSession();
    const workspaceId = await getWorkspaceId();

    const name = String(formData.get("name") ?? "").trim();
    const value = String(formData.get("value") ?? "");
    const description = String(
        formData.get("description") ?? "",
    ).trim();

    if (!name) throw new Error("Secret name is required");
    if (!value) throw new Error("Secret value is required");

    await createSecret(session, workspaceId, {
        name,
        value,
        description: description || null,
        managedBy: "user",
    });

    revalidatePath(VAULT_PATH);

    return { success: true };
}

export async function updateVaultSecret(
    id: string,
    formData: FormData,
) {
    const session = await currentSession();
    const workspaceId = await getWorkspaceId();

    await getUserManagedSecret(session, id, workspaceId);

    const name = String(formData.get("name") ?? "").trim();
    const value = String(formData.get("value") ?? "");
    const description = String(
        formData.get("description") ?? "",
    ).trim();

    if (!name) throw new Error("Secret name is required");

    await updateSecret(session, workspaceId, id, {
        name,
        description: description || null,
        ...(value ? { value } : {}),
    });

    revalidatePath(VAULT_PATH);

    return { success: true };
}

export async function deleteVaultSecret(id: string) {
    const session = await currentSession();
    const workspaceId = await getWorkspaceId();

    await getUserManagedSecret(session, id, workspaceId);

    await deleteSecret(session, id, workspaceId);

    revalidatePath(VAULT_PATH);

    return { success: true };
}
