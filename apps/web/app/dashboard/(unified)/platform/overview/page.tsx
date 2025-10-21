import { Mail, Globe, Plug, Send } from "lucide-react";
import Link from "next/link";
import { Button } from "@mantine/core";
import { getDashboardStats } from "@/lib/actions/dashboard";
import { Container } from "@/components/common/containers";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import React from "react";

export default async function Page() {
	const isNewUser = true;
	const { data: statsData } = await getDashboardStats();

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
										Welcome to Kurrier 👋
									</h2>
									<p className="text-sm text-muted-foreground max-w-prose">
										Let’s get your email system up and running. Start by
										connecting a provider, verifying a domain, or creating your
										first identity.
									</p>
								</div>
								<div className="mt-4 md:mt-0 flex gap-3">
									<Button>
										<Link href="/dashboard/platform/providers">
											Add Provider
										</Link>
									</Button>
									<Link
										href="/dashboard/platform/identities"
										className="px-4 py-2 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted transition"
									>
										Create Identity
									</Link>
								</div>
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
