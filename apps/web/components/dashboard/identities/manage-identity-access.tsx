"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IdentityEntity, WorkspaceEntity } from "@db";
import {
    ActionIcon,
    Button,
    Modal,
    MultiSelect,
    Radio,
    Tooltip,
} from "@mantine/core";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useSiteFeatures } from "@/components/providers/site-features-provider";
import {
    type FetchAdminWorkspaceIdentitiesResult,
    type FetchWorkspaceMembersResult,
    updateIdentityAccess,
} from "@/lib/actions/workspace";

type AccessMode = "workspace" | "selected";

export default function ManageIdentityAccess({
                                                 identity,
                                                 workspace,
                                                 workspaceMembers,
                                                 workspaceUserIdentities,
                                                 canManage,
                                             }: {
    identity: IdentityEntity;
    workspace: WorkspaceEntity;
    workspaceMembers: FetchWorkspaceMembersResult;
    workspaceUserIdentities: FetchAdminWorkspaceIdentitiesResult;
    canManage: boolean;
}) {
    const router = useRouter();
    const features = useSiteFeatures();
    const isDefault = workspace.defaultIdentityId === identity.id;

    const memberOptions = useMemo(
        () =>
            workspaceMembers.flatMap((member) =>
                member.users
                    ? [
                        {
                            value: member.users.id,
                            label: member.users.email,
                        },
                    ]
                    : []
            ),
        [workspaceMembers]
    );

    const assignedMemberIds = useMemo(
        () =>
            workspaceUserIdentities
                .filter(
                    (assignment) =>
                        assignment.workspace_identity_members.identityId === identity.id
                )
                .map((assignment) => assignment.workspace_identity_members.userId),
        [identity.id, workspaceUserIdentities]
    );

    const initialMode: AccessMode = identity.sharedWithWorkspace
        ? "workspace"
        : "selected";

    const [opened, setOpened] = useState(false);
    const [mode, setMode] = useState<AccessMode>(initialMode);
    const [memberIds, setMemberIds] = useState<string[]>(assignedMemberIds);
    const [saving, setSaving] = useState(false);

    if (
        !features.identityAccessManagement ||
        !canManage ||
        workspaceMembers.length < 2
    ) {
        return null;
    }

    const openModal = () => {
        setMode(isDefault ? "workspace" : initialMode);
        setMemberIds(assignedMemberIds);
        setOpened(true);
    };

    const save = async () => {
        const sharedWithWorkspace = isDefault || mode === "workspace";

        if (!sharedWithWorkspace && memberIds.length === 0) {
            return;
        }

        setSaving(true);

        const result = await updateIdentityAccess({
            identityId: identity.id,
            sharedWithWorkspace,
            memberIds: sharedWithWorkspace
                ? memberOptions.map((member) => member.value)
                : memberIds,
        });

        setSaving(false);

        if (!result.success) {
            toast.error(result.error);
            return;
        }

        toast.success("Identity access updated");
        setOpened(false);
        router.refresh();
    };

    return (
        <>
            <Tooltip label="Manage access" withArrow>
                <ActionIcon
                    variant="default"
                    aria-label="Manage identity access"
                    onClick={openModal}
                >
                    <Settings2 className="size-4" />
                </ActionIcon>
            </Tooltip>

            <Modal
                opened={opened}
                onClose={() => setOpened(false)}
                title="Manage identity access"
                centered
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-muted-foreground">
                        Choose who can access{" "}
                        <span className="font-medium text-foreground">
              {identity.value}
            </span>
                        .
                    </p>

                    <Radio.Group
                        value={isDefault ? "workspace" : mode}
                        onChange={(value) => setMode(value as AccessMode)}
                    >
                        <div className="flex flex-col gap-3">
                            <Radio value="workspace" label="Everyone in this workspace" />
                            <Radio
                                value="selected"
                                label="Selected workspace members"
                                disabled={isDefault}
                            />
                        </div>
                    </Radio.Group>

                    {isDefault ? (
                        <p className="text-xs text-muted-foreground">
                            The default identity must be available to everyone in the
                            workspace.
                        </p>
                    ) : null}

                    {!isDefault && mode === "selected" ? (
                        <MultiSelect
                            label="Workspace members"
                            placeholder="Select members"
                            data={memberOptions}
                            value={memberIds}
                            onChange={setMemberIds}
                            searchable
                            clearable
                        />
                    ) : null}

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="default"
                            onClick={() => setOpened(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={save}
                            loading={saving}
                            disabled={
                                !isDefault && mode === "selected" && memberIds.length === 0
                            }
                        >
                            Save
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
