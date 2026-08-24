"use client";

import * as React from "react";

import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Modal,
    PasswordInput,
    Table,
    Textarea,
    TextInput,
    Tooltip,
} from "@mantine/core";

import {
    IconCheck,
    IconCopy,
    IconEye,
    IconEyeOff,
    IconKey,
    IconLock,
    IconPencil,
    IconPlus,
    IconShieldLock,
    IconTrash,
} from "@tabler/icons-react";

import { Vault } from "lucide-react";
import { toast } from "sonner";

import { Container } from "@/components/common/containers";
import type { FetchVaultSecretsResult } from "@/lib/actions/vault";

type VaultSecret = FetchVaultSecretsResult[number];

type ManageVaultProps = {
    secrets: VaultSecret[];

    createSecret: (formData: FormData) => Promise<any>;

    updateSecret: (
        id: string,
        formData: FormData,
    ) => Promise<any>;

    deleteSecret: (id: string) => Promise<any>;

    revealSecret: (
        id: string,
    ) => Promise<{ value: string }>;
};

export default function ManageVault({
                                        secrets,
                                        createSecret,
                                        updateSecret,
                                        deleteSecret,
                                        revealSecret,
                                    }: ManageVaultProps) {
    const [opened, setOpened] = React.useState(false);
    const [editing, setEditing] = React.useState<VaultSecret | null>(null);

    const [pending, startTransition] = React.useTransition();

    const [revealed, setRevealed] = React.useState<Record<string, string>>({});
    const [revealingId, setRevealingId] = React.useState<string | null>(null);
    const [copiedId, setCopiedId] = React.useState<string | null>(null);

    const openCreate = () => {
        setEditing(null);
        setOpened(true);
    };

    const openEdit = (secret: VaultSecret) => {
        setEditing(secret);
        setOpened(true);
    };

    const close = () => {
        if (pending) return;

        setOpened(false);
        setEditing(null);
    };

    const submit = (formData: FormData) => {
        startTransition(async () => {
            try {
                if (editing) {
                    await updateSecret(editing.id, formData);
                    toast.success("Secret updated");
                } else {
                    await createSecret(formData);
                    toast.success("Secret added to Vault");
                }

                close();
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Could not save secret",
                );
            }
        });
    };

    const reveal = async (secret: VaultSecret) => {
        if (revealed[secret.id]) {
            setRevealed((current) => {
                const next = { ...current };
                delete next[secret.id];
                return next;
            });

            return;
        }

        try {
            setRevealingId(secret.id);

            const result = await revealSecret(secret.id);

            setRevealed((current) => ({
                ...current,
                [secret.id]: result.value,
            }));
        } catch {
            toast.error("Could not reveal secret");
        } finally {
            setRevealingId(null);
        }
    };

    const copyValue = async (secret: VaultSecret) => {
        try {
            let value = revealed[secret.id];

            if (!value) {
                const result = await revealSecret(secret.id);
                value = result.value;
            }

            await navigator.clipboard.writeText(value);

            setCopiedId(secret.id);
            toast.success("Secret copied");

            window.setTimeout(() => {
                setCopiedId(null);
            }, 1500);
        } catch {
            toast.error("Could not copy secret");
        }
    };

    const remove = (secret: VaultSecret) => {
        if (
            !window.confirm(
                `Delete "${secret.name}"? Anything using this secret may stop working.`,
            )
        ) {
            return;
        }

        startTransition(async () => {
            try {
                await deleteSecret(secret.id);

                setRevealed((current) => {
                    const next = { ...current };
                    delete next[secret.id];
                    return next;
                });

                toast.success("Secret deleted");
            } catch (error) {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Could not delete secret",
                );
            }
        });
    };

    const formatDate = (value: Date | string) =>
        new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
        }).format(value instanceof Date ? value : new Date(value));

    return (
        <Container variant="wide">
            <div className="flex items-start justify-between gap-4 py-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-foreground">
                        Vault
                    </h1>

                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Securely store credentials used by integrations, adapters and
                        external services.
                    </p>
                </div>

                <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={openCreate}
                >
                    Add secret
                </Button>
            </div>

            <Card className="mt-4 !rounded-2xl border shadow-none overflow-hidden">
                <div className="flex items-start gap-3 border-b bg-muted/25 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                        <IconShieldLock size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 className="font-medium text-foreground">
                            Encrypted secrets
                        </h2>

                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Values are encrypted at rest and only decrypted when
                            authorized services request them.
                        </p>
                    </div>

                    {secrets.length > 0 && (
                        <Badge variant="light" radius="sm">
                            {secrets.length}{" "}
                            {secrets.length === 1 ? "secret" : "secrets"}
                        </Badge>
                    )}
                </div>

                {secrets.length === 0 ? (
                    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/30">
                            <Vault size={21} />
                        </div>

                        <h3 className="mt-4 text-sm font-medium text-foreground">
                            Your Vault is empty
                        </h3>

                        <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                            Store API tokens, signing secrets and credentials that
                            Kurrier integrations can use securely.
                        </p>

                        <Button
                            className="mt-5"
                            variant="light"
                            leftSection={<IconPlus size={15} />}
                            onClick={openCreate}
                        >
                            Add your first secret
                        </Button>
                    </div>
                ) : (
                    <Table verticalSpacing="md" highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Secret</Table.Th>
                                <Table.Th>Value</Table.Th>
                                <Table.Th>Encryption</Table.Th>
                                <Table.Th>Updated</Table.Th>
                                <Table.Th />
                            </Table.Tr>
                        </Table.Thead>

                        <Table.Tbody>
                            {secrets.map((secret) => {
                                const value = revealed[secret.id];

                                return (
                                    <Table.Tr key={secret.id}>
                                        <Table.Td>
                                            <Group gap="sm" wrap="nowrap">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
                                                    <IconKey size={15} />
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="font-medium">
                                                        {secret.name}
                                                    </div>

                                                    {secret.description ? (
                                                        <div className="mt-0.5 max-w-sm truncate text-xs text-muted-foreground">
                                                            {secret.description}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-0.5 text-xs text-muted-foreground">
                                                            No description
                                                        </div>
                                                    )}
                                                </div>
                                            </Group>
                                        </Table.Td>

                                        <Table.Td>
                                            <Group gap={5} wrap="nowrap">
                                                <code className="inline-block max-w-72 truncate rounded bg-muted px-2 py-1 text-xs">
                                                    {value
                                                        ? value
                                                        : "••••••••••••••••••••"}
                                                </code>

                                                <Tooltip
                                                    label={value ? "Hide" : "Reveal"}
                                                >
                                                    <ActionIcon
                                                        variant="subtle"
                                                        size="sm"
                                                        loading={revealingId === secret.id}
                                                        onClick={() => reveal(secret)}
                                                    >
                                                        {value ? (
                                                            <IconEyeOff size={14} />
                                                        ) : (
                                                            <IconEye size={14} />
                                                        )}
                                                    </ActionIcon>
                                                </Tooltip>

                                                <Tooltip label="Copy secret">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        size="sm"
                                                        onClick={() => copyValue(secret)}
                                                    >
                                                        {copiedId === secret.id ? (
                                                            <IconCheck size={14} />
                                                        ) : (
                                                            <IconCopy size={14} />
                                                        )}
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Table.Td>

                                        <Table.Td>
                                            <Badge
                                                variant="outline"
                                                radius="sm"
                                                leftSection={<IconLock size={10} />}
                                            >
                                                AES-256-GCM · v{secret.keyVersion}
                                            </Badge>
                                        </Table.Td>

                                        <Table.Td className="text-sm text-muted-foreground">
                                            {/*{formatDate(secret.updatedAt)}*/}
                                        </Table.Td>

                                        <Table.Td>
                                            <Group justify="flex-end" gap={4}>
                                                <Tooltip label="Edit">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        onClick={() => openEdit(secret)}
                                                    >
                                                        <IconPencil size={15} />
                                                    </ActionIcon>
                                                </Tooltip>

                                                <Tooltip label="Delete">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        disabled={pending}
                                                        onClick={() => remove(secret)}
                                                    >
                                                        <IconTrash size={15} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                )}
            </Card>

            <div className="mt-5 flex items-start gap-3 rounded-xl border bg-muted/20 px-4 py-3">
                <IconLock
                    size={16}
                    className="mt-0.5 shrink-0 text-muted-foreground"
                />

                <p className="text-xs leading-5 text-muted-foreground">
                    Secret values are encrypted before storage. Integrations can
                    reference Vault entries without storing credentials in their own
                    configuration.
                </p>
            </div>

            <Modal
                opened={opened}
                onClose={close}
                title={editing ? "Edit secret" : "Add secret"}
                centered
                radius="lg"
            >
                <form action={submit}>
                    <div className="space-y-4">
                        <TextInput
                            name="name"
                            label="Key"
                            required
                            defaultValue={editing?.name ?? ""}
                            placeholder="MAILTRAP_API_TOKEN"
                            description="A stable name applications and adapters can reference."
                        />

                        <Textarea
                            name="description"
                            label="Description"
                            defaultValue={editing?.description ?? ""}
                            placeholder="Mailtrap token for inbound email ingestion"
                            minRows={2}
                        />

                        <PasswordInput
                            name="value"
                            label={editing ? "New value" : "Value"}
                            required={!editing}
                            placeholder={
                                editing
                                    ? "Leave blank to keep current value"
                                    : "Enter secret value"
                            }
                            description={
                                editing
                                    ? "Leave this empty if you only want to change the key or description."
                                    : "The value will be encrypted before it is stored."
                            }
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="default"
                                type="button"
                                onClick={close}
                                disabled={pending}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                loading={pending}
                                leftSection={
                                    editing ? (
                                        <IconPencil size={15} />
                                    ) : (
                                        <IconPlus size={15} />
                                    )
                                }
                            >
                                {editing ? "Save changes" : "Add secret"}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </Container>
    );
}
