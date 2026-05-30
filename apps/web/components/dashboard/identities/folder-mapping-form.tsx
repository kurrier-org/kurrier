"use client";

import { useState, useEffect } from "react";
import { Button, Select, Stack, Text, Loader, Alert } from "@mantine/core";
import {
	MAPPABLE_FOLDER_ROLES,
	type FolderMappings,
	type MappableFolderRole,
	MailboxKindDisplay,
} from "@schema";
import { saveFolderMappings } from "@/lib/actions/mailbox";
import { toast } from "sonner";

type ImapFolder = {
	path: string;
	name: string;
	specialUse: string | null;
};

type Props = {
	identityId: string;
	initialMappings?: FolderMappings | null;
	onSaved?: () => void;
};

export default function FolderMappingForm({
	identityId,
	initialMappings,
	onSaved,
}: Props) {
	const [folders, setFolders] = useState<ImapFolder[]>([]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [mappings, setMappings] = useState<FolderMappings>(
		initialMappings ?? {},
	);

	useEffect(() => {
		fetch(`/api/kurrier/identities/${identityId}/imap-folders`)
			.then(async (res) => {
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(body?.message ?? `HTTP ${res.status}`);
				}
				return res.json();
			})
			.then((data) => {
				setFolders(data.folders ?? []);
			})
			.catch((err) => {
				setFetchError(err?.message ?? "Failed to load folders");
			})
			.finally(() => setLoading(false));
	}, [identityId]);

	const folderOptions = [
		{ label: "— Auto-detect —", value: "" },
		...folders.map((f) => ({ label: f.path, value: f.path })),
	];

	const handleChange = (role: MappableFolderRole, value: string | null) => {
		setMappings((prev) => ({ ...prev, [role]: value || null }));
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			await saveFolderMappings(identityId, mappings);
			toast.success("Folder mappings saved");
			onSaved?.();
		} catch {
			toast.error("Failed to save folder mappings");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader size="sm" />
			</div>
		);
	}

	return (
		<Stack gap="md">
			{fetchError && (
				<Alert color="red" title="Could not load folders">
					{fetchError}. You can still save mappings if you know the folder paths.
				</Alert>
			)}

			<Text size="sm" c="dimmed">
				Map each role to the IMAP folder path used by your server. Leave blank
				to use auto-detection.
			</Text>

			{MAPPABLE_FOLDER_ROLES.map((role) => (
				<Select
					key={role}
					label={MailboxKindDisplay[role]}
					data={folderOptions}
					value={mappings[role] ?? ""}
					onChange={(val) => handleChange(role, val)}
					searchable
					clearable
					placeholder="Auto-detect"
				/>
			))}

			<Button onClick={handleSave} loading={saving} mt="sm">
				Save Mappings
			</Button>
		</Stack>
	);
}
