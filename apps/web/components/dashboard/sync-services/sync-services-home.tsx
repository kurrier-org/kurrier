"use client";

import * as React from "react";
import { Container } from "@/components/common/containers";
import {
	Card,
	Table,
	ActionIcon,
	TextInput,
	Tooltip,
	Button,
} from "@mantine/core";
import { IconCopy, IconLockBolt } from "@tabler/icons-react";
import { toast } from "sonner";

import { getOrCreateDavPassword } from "@/lib/actions/dashboard";

type SyncServicesProps = {
	username: string;
	password?: string;
	baseDavUrl: string;
};

export default function SyncServicesHome({
	username,
	password,
	baseDavUrl,
}: SyncServicesProps) {
	const [currentPassword, setCurrentPassword] = React.useState(password ?? "");
	const [isSaving, setIsSaving] = React.useState(false);
	const [newPassword, setNewPassword] = React.useState("");
	const [showPasswordForm, setShowPasswordForm] = React.useState(false);

	const handleCopy = (value: string, label: string) => {
		if (!value) {
			toast.error(`Nothing to copy for ${label}`);
			return;
		}
		navigator.clipboard.writeText(value);
		toast.success(`Copied ${label}`);
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = newPassword.trim();
		if (!trimmed) {
			toast.error("Please enter a new password.");
			return;
		}

		setIsSaving(true);
		try {
			const updated = await getOrCreateDavPassword({ password: trimmed });

			if (updated.status === "created" || updated.status === "updated") {
				setCurrentPassword(updated.password ?? trimmed);
				toast.success("DAV password updated");
			} else {
				toast.error("Could not update DAV password");
			}

			setNewPassword("");
			setShowPasswordForm(false);
		} catch (err) {
			console.error(err);
			toast.error("Failed to update DAV password");
		} finally {
			setIsSaving(false);
		}
	};

	const base = baseDavUrl?.replace(/\/+$/, "") || "";

	const userRoot = `${base}/api/dav/${encodeURIComponent(username)}`;
	const wellKnownCal = `${base}/.well-known/caldav`;
	const wellKnownCard = `${base}/.well-known/carddav`;

	const rows = [
		{
			label: "CalDAV (calendar)",
			url: userRoot,
		},
		{
			label: "CardDAV (contacts)",
			url: userRoot,
		},
		{
			label: ".well-known CalDAV",
			url: wellKnownCal,
		},
		{
			label: ".well-known CardDAV",
			url: wellKnownCard,
		},
	];

	return (
		<Container variant="wide">
			<div className="flex items-center justify-between my-4">
				<h1 className="text-xl font-bold text-foreground">Sync Services</h1>
			</div>

			<p className="max-w-prose text-sm text-muted-foreground my-6">
				Set up calendar and contacts sync using CalDAV and CardDAV. Connect your
				devices and apps to keep events and address books updated automatically.
			</p>

			<Card className="shadow-none mt-4 !rounded-2xl border">
				<div className="flex flex-col gap-4 p-4">
					<div className="flex flex-col gap-1">
						<h2 className="text-sm font-semibold text-foreground">
							DAV credentials
						</h2>
						<p className="text-xs text-muted-foreground max-w-prose">
							These credentials are used by your calendar and contacts apps.
							They are <span className="font-semibold">separate</span> from your
							Kurrier login.
						</p>
					</div>

					<div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)]">
						{/* Username */}
						<div className="space-y-2">
							<label className="text-xs font-medium text-muted-foreground">
								DAV username
							</label>
							<TextInput
								value={username}
								readOnly
								classNames={{ input: "font-mono text-xs" }}
								rightSection={
									<Tooltip label="Copy username" withArrow>
										<ActionIcon
											variant="subtle"
											onClick={() => handleCopy(username, "DAV username")}
										>
											<IconCopy size={16} />
										</ActionIcon>
									</Tooltip>
								}
							/>
							<p className="text-[11px] text-muted-foreground">
								Use this as the{" "}
								<span className="font-medium">account / user name</span> in your
								CalDAV / CardDAV apps.
							</p>
						</div>

						<div className="space-y-2">
							<label className="text-xs font-medium text-muted-foreground">
								DAV password
							</label>

							<TextInput
								value={currentPassword}
								readOnly
								type="text"
								placeholder="Generate a DAV password to see it here."
								classNames={{ input: "font-mono text-xs" }}
								rightSection={
									<Tooltip label="Copy password" withArrow>
										<ActionIcon
											variant="subtle"
											onClick={() =>
												handleCopy(currentPassword, "DAV password")
											}
										>
											<IconCopy size={16} />
										</ActionIcon>
									</Tooltip>
								}
							/>

							<div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
								<span>
									When you create or rotate your DAV password, it will appear
									here so you can copy it to your devices.
								</span>
							</div>

							<div className="pt-1">
								{!showPasswordForm ? (
									<button
										type="button"
										onClick={() => setShowPasswordForm(true)}
										className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition"
									>
										<IconLockBolt size={18} />
										{currentPassword ? "Rotate password" : "Generate password"}
									</button>
								) : (
									<form
										onSubmit={handlePasswordSubmit}
										className="flex flex-col gap-2 sm:flex-row sm:items-center"
									>
										<TextInput
											placeholder="Enter new DAV password"
											value={newPassword}
											onChange={(e) => setNewPassword(e.currentTarget.value)}
											size="xs"
											className="sm:max-w-xs"
											autoFocus
										/>
										<div className="flex gap-2 items-center">
											<Button type="submit" size={"xs"} disabled={isSaving}>
												{isSaving ? "Saving…" : "Save password"}
											</Button>
											<Button
												type="button"
												variant="subtle"
												size={"xs"}
												onClick={() => {
													setShowPasswordForm(false);
													setNewPassword("");
												}}
											>
												Cancel
											</Button>
										</div>
									</form>
								)}
							</div>
						</div>
					</div>
				</div>
			</Card>

			<Card className="shadow-none mt-6 !rounded-2xl border">
				<div className="p-4 space-y-3">
					<div className="space-y-1">
						<h2 className="text-sm font-semibold text-foreground">
							Connection URLs
						</h2>
						<p className="text-xs text-muted-foreground max-w-prose">
							Use these URLs when adding a CalDAV or CardDAV account on your
							devices. Most apps accept either the full URL or the{" "}
							<code>/.well-known</code> endpoints.
						</p>
					</div>

					<Table verticalSpacing="xs" highlightOnHover>
						<Table.Thead>
							<Table.Tr>
								<Table.Th className="text-xs font-semibold text-muted-foreground">
									Service
								</Table.Th>
								<Table.Th className="text-xs font-semibold text-muted-foreground">
									URL
								</Table.Th>
								<Table.Th className="w-16 text-right text-xs font-semibold text-muted-foreground">
									Actions
								</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{rows.map((row) => (
								<Table.Tr key={row.label}>
									<Table.Td className="text-xs">{row.label}</Table.Td>
									<Table.Td className="font-mono text-[11px] break-all">
										{row.url}
									</Table.Td>
									<Table.Td className="text-right">
										<Tooltip label="Copy URL" withArrow>
											<ActionIcon
												variant="subtle"
												aria-label={`Copy ${row.label} URL`}
												onClick={() => handleCopy(row.url, `${row.label} URL`)}
											>
												<IconCopy size={16} />
											</ActionIcon>
										</Tooltip>
									</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				</div>
			</Card>

			<Card className="shadow-none mt-6 !rounded-2xl border bg-muted/40">
				<div className="p-4 space-y-1">
					<h2 className="text-xs font-semibold text-foreground">
						Using these settings
					</h2>
					<ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1">
						<li>
							When asked for a <span className="font-medium">server</span> or{" "}
							<span className="font-medium">account URL</span>, paste the
							appropriate CalDAV or CardDAV URL from above.
						</li>
						<li>
							Use the <span className="font-medium">DAV username</span> and{" "}
							<span className="font-medium">DAV password</span> when your device
							prompts for login.
						</li>
						<li>
							If sync fails after changing the password, make sure you update
							the stored password on each device.
						</li>
					</ul>
				</div>
			</Card>
		</Container>
	);
}
