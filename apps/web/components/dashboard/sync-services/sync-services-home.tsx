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

import { regenerateDavPassword } from "@/lib/actions/dashboard";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

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
	const dict = useOptionalDictionary();
	const [isSaving, setIsSaving] = React.useState(false);

	const handleCopy = (value: string, label: string) => {
		if (!value) {
			toast.error(
				`${dict?.platform?.nothingToCopyForPrefix ?? "Nothing to copy for "}${label}`,
			);
			return;
		}
		navigator.clipboard.writeText(value);
		toast.success(`${dict?.platform?.copiedPrefix ?? "Copied "}${label}`);
	};

	const base = baseDavUrl?.replace(/\/+$/, "") || "";

	const userRoot = `${base.replace("https://", "")}`;
	// const wellKnownCal = `${base}/.well-known/caldav`;
	// const wellKnownCard = `${base}/.well-known/carddav`;

	const rows = [
		{
			label: dict?.platform?.caldavCalendar ?? "CalDAV (calendar)",
			url: userRoot,
		},
		{
			label: dict?.platform?.carddavContacts ?? "CardDAV (contacts)",
			url: userRoot,
		},
		// {
		// 	label: ".well-known CalDAV",
		// 	url: wellKnownCal,
		// },
		// {
		// 	label: ".well-known CardDAV",
		// 	url: wellKnownCard,
		// },
	];

	return (
		<Container variant="wide">
			<div className="flex items-center justify-between my-4">
				<h1 className="text-xl font-bold text-foreground">
					{dict?.platform?.syncServicesPageTitle ?? "Sync Services"}
				</h1>
			</div>

			<p className="max-w-prose text-sm text-muted-foreground my-6">
				{dict?.platform?.syncServicesDescription ??
					"Set up calendar and contacts sync using CalDAV and CardDAV. Connect your devices and apps to keep events and address books updated automatically."}
			</p>

			<Card className="shadow-none mt-4 !rounded-2xl border">
				<div className="flex flex-col gap-4 p-4">
					<div className="flex flex-col gap-1">
						<h2 className="text-sm font-semibold text-foreground">
							{dict?.platform?.davCredentials ?? "DAV credentials"}
						</h2>
						<p className="text-xs text-muted-foreground max-w-prose">
							{dict?.platform?.davCredentialsHelpPrefix ??
								"These credentials are used by your calendar and contacts apps. They are "}
							<span className="font-semibold">
								{dict?.platform?.separateWord ?? "separate"}
							</span>
							{dict?.platform?.davCredentialsHelpSuffix ??
								" from your Kurrier login."}
						</p>
					</div>

					<div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.6fr)]">
						{/* Username */}
						<div className="space-y-2">
							<label className="text-xs font-medium text-muted-foreground">
								{dict?.platform?.davUsername ?? "DAV username"}
							</label>
							<TextInput
								value={username}
								readOnly
								classNames={{ input: "font-mono text-xs" }}
								rightSection={
									<Tooltip
										label={dict?.platform?.copyUsername ?? "Copy username"}
										withArrow
									>
										<ActionIcon
											variant="subtle"
											onClick={() =>
												handleCopy(
													username,
													dict?.platform?.davUsername ?? "DAV username",
												)
											}
										>
											<IconCopy size={16} />
										</ActionIcon>
									</Tooltip>
								}
							/>
							<p className="text-[11px] text-muted-foreground">
								{dict?.platform?.useThisAsThePrefix ?? "Use this as the "}{" "}
								<span className="font-medium">
									{dict?.platform?.accountUserName ?? "account / user name"}
								</span>
								{dict?.platform?.inYourCaldavApps ??
									" in your CalDAV / CardDAV apps."}
							</p>
						</div>

						<div className="space-y-2">
							<label className="text-xs font-medium text-muted-foreground">
								{dict?.platform?.davPassword ?? "DAV password"}
							</label>

							<TextInput
								value={password}
								readOnly
								type="text"
								placeholder={
									dict?.platform?.generateDavPasswordPlaceholder ??
									"Generate a DAV password to see it here."
								}
								classNames={{ input: "font-mono text-xs" }}
								rightSection={
									<Tooltip
										label={dict?.platform?.copyPassword ?? "Copy password"}
										withArrow
									>
										<ActionIcon
											variant="subtle"
											onClick={() =>
												handleCopy(
													String(password),
													dict?.platform?.davPassword ?? "DAV password",
												)
											}
										>
											<IconCopy size={16} />
										</ActionIcon>
									</Tooltip>
								}
							/>

							<div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
								<span>
									{dict?.platform?.davPasswordAppearHere ??
										"When you create or rotate your DAV password, it will appear here so you can copy it to your devices."}
								</span>
							</div>

							<div className="pt-1">
								<Button
									type="button"
									loading={isSaving}
									onClick={async () => {
										setIsSaving(true);
										await regenerateDavPassword();
										setIsSaving(false);
									}}
									size={"xs"}
									leftSection={<IconLockBolt size={18} />}
								>
									{password
										? (dict?.platform?.regeneratePassword ??
											"Regenerate password")
										: (dict?.platform?.generatePassword ?? "Generate password")}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</Card>

			<Card className="shadow-none mt-6 !rounded-2xl border">
				<div className="p-4 space-y-3">
					<div className="space-y-1">
						<h2 className="text-sm font-semibold text-foreground">
							{dict?.platform?.connectionUrls ?? "Connection URLs"}
						</h2>
						<p className="text-xs text-muted-foreground max-w-prose">
							{dict?.platform?.connectionUrlsHelpPrefix ??
								"Use these URLs when adding a CalDAV or CardDAV account on your devices. Most apps accept either the full URL or the "}{" "}
							<code>/.well-known</code>
							{dict?.platform?.connectionUrlsHelpSuffix ?? " endpoints."}
						</p>
					</div>

					<Table verticalSpacing="xs" highlightOnHover>
						<Table.Thead>
							<Table.Tr>
								<Table.Th className="text-xs font-semibold text-muted-foreground">
									{dict?.platform?.service ?? "Service"}
								</Table.Th>
								<Table.Th className="text-xs font-semibold text-muted-foreground">
									{dict?.platform?.url ?? "URL"}
								</Table.Th>
								<Table.Th className="w-16 text-right text-xs font-semibold text-muted-foreground">
									{dict?.platform?.actions ?? "Actions"}
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
										<Tooltip
											label={dict?.platform?.copyUrl ?? "Copy URL"}
											withArrow
										>
											<ActionIcon
												variant="subtle"
												aria-label={`${dict?.platform?.copyPrefix ?? "Copy "}${row.label}${dict?.platform?.urlSuffix ?? " URL"}`}
												onClick={() =>
													handleCopy(
														row.url,
														`${row.label}${dict?.platform?.urlSuffix ?? " URL"}`,
													)
												}
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
						{dict?.platform?.usingTheseSettings ?? "Using these settings"}
					</h2>
					<ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-1">
						<li>
							{dict?.platform?.whenAskedForAPrefix ?? "When asked for a "}
							<span className="font-medium">
								{dict?.platform?.serverWord ?? "server"}
							</span>
							{dict?.platform?.orWord ?? " or "}{" "}
							<span className="font-medium">
								{dict?.platform?.accountUrlWord ?? "account URL"}
							</span>
							{dict?.platform?.pasteAppropriateUrl ??
								", paste the appropriate CalDAV or CardDAV URL from above."}
						</li>
						<li>
							{dict?.platform?.useThePrefix ?? "Use the "}
							<span className="font-medium">
								{dict?.platform?.davUsername ?? "DAV username"}
							</span>
							{dict?.platform?.andWord ?? " and "}{" "}
							<span className="font-medium">
								{dict?.platform?.davPassword ?? "DAV password"}
							</span>
							{dict?.platform?.whenDevicePrompts ??
								" when your device prompts for login."}
						</li>
						<li>
							{dict?.platform?.ifSyncFailsHelp ??
								"If sync fails after changing the password, make sure you update the stored password on each device."}
						</li>
					</ul>
				</div>
			</Card>
		</Container>
	);
}
