"use client";

import * as React from "react";
import { Container } from "@/components/common/containers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@mantine/core";
import { HardDrive, Plus, CheckCircle, Clock } from "lucide-react";
import type { SyncProvidersRow } from "@/lib/actions/dashboard";
import { DriveVolumeEntity } from "@db";
import dayjs from "dayjs";
import Link from "next/link";
import { IconDatabaseShare } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import AddVolumeForm from "@/components/dashboard/storage/add-volume-form";

function SectionHeader({
	title,
	count,
	action,
	subtitle,
}: {
	title: string;
	count?: number;
	subtitle?: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-start justify-between">
			<div>
				<div className="flex items-center gap-2">
					<h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
						{title}
					</h2>
					<span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
						{count ?? 0}
					</span>
				</div>
				{subtitle ? (
					<p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
				) : null}
			</div>
			{action ? <div className="ml-4">{action}</div> : null}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="rounded-lg border border-dashed p-6 text-center">
			<p className="text-sm text-muted-foreground">
				No volumes yet — create your first one to get started.
			</p>
		</div>
	);
}

function VolumeStatusPill({ verified }: { verified: boolean }) {
	return (
		<span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
			{verified ? (
				<CheckCircle className="size-3.5" />
			) : (
				<Clock className="size-3.5" />
			)}
			{verified ? "Provider verified" : "Provider not verified"}
		</span>
	);
}

export default function VolumesManager({
	userProviders,
	volumes,
	providerSelectOptions,
}: {
	userProviders: SyncProvidersRow[];
	volumes: DriveVolumeEntity[];
	providerSelectOptions: { label: string; value: string }[];
}) {
	const openAddVolumeForm = async () => {
		const openModalId = modals.open({
			title: (
				<div className="font-semibold text-brand-foreground">Add Volume</div>
			),
			closeOnEscape: false,
			closeOnClickOutside: false,
			size: "lg",
			children: (
				<div className="p-2">
					<AddVolumeForm
						userProviders={userProviders}
						providerSelectOptions={providerSelectOptions}
						onCompleted={() => modals.close(openModalId)}
					/>
				</div>
			),
		});
	};

	return (
		<Container variant="wide">
			<div className="flex items-center justify-between my-4">
				<h1 className="text-xl font-bold text-foreground">Storage</h1>
			</div>

			<p className="max-w-prose text-sm text-muted-foreground my-6">
				Configure storage providers and manage volumes that appear in Drive.
			</p>

			<Card className="shadow-none mb-48">
				<CardContent className="space-y-10">
					<div className="space-y-3">
						<SectionHeader
							title="Volumes"
							count={volumes.length}
							subtitle="Volumes are named roots (local paths or buckets) that users can browse in Drive."
							action={
								<Button
									onClick={openAddVolumeForm}
									variant="outline"
									size="sm"
									className="gap-2"
									aria-label="Create volume"
								>
									<Plus className="size-4" />
									Create Volume
								</Button>
							}
						/>

						{volumes.length === 0 ? (
							<EmptyState />
						) : (
							<div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
								{volumes.map((v) => {
									const volumeProvider = userProviders.find(
										(provider) => provider.id === v.providerId,
									);
									const verification = userProviders.find(
										(provider) => provider.id === v.providerId,
									)?.metaData?.verification;
									const providerType = volumeProvider?.type ?? "local";
									const isLocal = v.kind === "local";
									return (
										<div
											key={v.id}
											className="rounded-lg border p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="min-w-0">
												<div className="flex items-start gap-2">
													<HardDrive className="mt-1 size-4 shrink-0 text-muted-foreground" />
													<div className="min-w-0">
														<div className="truncate font-semibold text-brand-foreground flex gap-2 flex-wrap items-center">
															<span>{v.label}</span>
															<span className="text-xxs text-muted-foreground font-normal">
																· {providerType?.toUpperCase()}
															</span>
														</div>

														<div className="mt-2 flex flex-wrap items-center gap-2">
															<VolumeStatusPill
																verified={isLocal ? true : verification?.store}
															/>
															{v.createdAt ? (
																<span className="text-xs text-muted-foreground">
																	Created:{" "}
																	{dayjs(v.createdAt).format("MMM D, YYYY")}
																</span>
															) : null}
														</div>
													</div>
												</div>
											</div>

											<div className="flex gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
												<Button
													leftSection={<IconDatabaseShare className="size-4" />}
													size="xs"
													className="flex-1 sm:flex-none"
													href={
														v.code === "home"
															? "/dashboard/drive"
															: `/dashboard/drive/volumes/${v.publicId}`
													}
													component={Link}
												>
													View
												</Button>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</Container>
	);
}
