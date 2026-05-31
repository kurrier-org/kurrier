import { Mail, Globe, Plug, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@mantine/core";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { Container } from "@/components/common/containers";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import React from "react";
import {getWorkspacePublicId, getWorkspaceRole} from "@/lib/actions/clients";
import {fetchWorkspace} from "@/lib/actions/workspace";

export default async function Page() {
	const isNewUser = true;
	const { data: statsData } = await getDashboardStats();
	const workspacePublicId = await getWorkspacePublicId()
	const workspaceRole = await getWorkspaceRole()
	const workspace = await fetchWorkspace()

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
					<div className="space-y-6">
						{isNewUser && (
							<div className="rounded-xl border border-border bg-gradient-to-br from-muted/60 to-muted/30 p-6 flex flex-col md:flex-row justify-between items-start md:items-center">
								<div>
									<h2 className="text-lg font-semibold text-foreground mb-1">
										Welcome to <span className={"capitalize"}>{workspace?.name} 👋</span>
									</h2>

									{workspaceRole === "owner" && (
										<p className="text-sm text-muted-foreground max-w-prose">
											You’re the owner of this workspace. Set up your email infrastructure by
											connecting a provider, verifying a domain, and creating your first identity.
											Once configured, your team can start sending and receiving mail.
										</p>
									)}

									{workspaceRole === "member" && (
										<p className="text-sm text-muted-foreground max-w-prose">
											You’re a member of this workspace. Once email providers and identities are
											configured, you’ll be able to send and manage email from here.
											Contact your workspace owner if setup is incomplete.
										</p>
									)}
								</div>

								{workspaceRole === "owner" && (
									<div className="mt-4 md:mt-0 flex gap-3">
										<Button>
											<Link href={`/w/${workspacePublicId}/dashboard/platform/providers`}>
												Add Provider
											</Link>
										</Button>

										<Link
											href={`/w/${workspacePublicId}/dashboard/platform/identities`}
											className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted transition"
										>
											Create Identity
										</Link>
									</div>
								)}
							</div>
						)}

						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							<StatCard
								icon={<Plug className="size-5 text-primary" />}
								label="Connected Providers"
								value={statsData?.connectedProviders || 0}
							/>
							<StatCard
								icon={<Globe className="size-5 text-primary" />}
								label="Verified Domains"
								value={statsData?.verifiedDomains || 0}
							/>
							<StatCard
								icon={<Send className="size-5 text-primary" />}
								label="Active Identities"
								value={statsData?.activeIdentities || 0}
							/>
							<StatCard
								icon={<Mail className="size-5 text-primary" />}
								label="Emails Processed"
								value={statsData?.emailsProcessedTotal || 0}
							/>
						</div>
					</div>
				</Container>
			</div>
		</>
	);
}

function StatCard({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-muted-foreground">
					{label}
				</span>
				{icon}
			</div>
			<div className="text-2xl font-semibold text-foreground">{value}</div>
		</div>
	);
}
