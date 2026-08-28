"use client";

import { Button } from "@mantine/core";
import { GOOGLE_SPEC } from "@schema";
import { Plus } from "lucide-react";
import GoogleAccountCard from "@/components/dashboard/providers/google-account-card";
import GoogleOAuthConfigButton from "@/components/dashboard/providers/google-oauth-config-form";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FetchGoogleAccountsResult } from "@/lib/actions/dashboard";

export default function GoogleCard({
	googleAccounts,
	googleOAuthConfigured,
}: {
	googleAccounts: FetchGoogleAccountsResult;
	googleOAuthConfigured: boolean;
}) {
	const dict = useOptionalDictionary();

	return (
		<div className="flex min-w-0 flex-col">
			<Card className="h-full min-w-0 border-border shadow-none">
				<CardHeader className="gap-2">
					<div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between">
						<div className="max-w-2xl">
							<CardTitle className="text-xl">
								{dict?.platform?.providerNameGoogle ?? GOOGLE_SPEC.name}
							</CardTitle>
							<p className="text-sm text-muted-foreground mt-1">
								{dict?.platform?.connectGmailDescription ??
									"Connect Gmail and Google Workspace accounts using OAuth."}
							</p>
							<p className="text-xs text-muted-foreground/80 mt-1">
								{dict?.platform?.googleSpecHelp ?? GOOGLE_SPEC.help}
							</p>
						</div>

						<div className="mt-3 w-full 2xl:mt-0 2xl:w-fit">
							{googleOAuthConfigured ? (
								<Button
									fullWidth
									size="sm"
									className="!min-h-11 !w-full gap-2 2xl:!min-h-9 2xl:!w-auto"
									component="a"
									href="/api/oauth/google/connect"
								>
									<Plus className="h-4 w-4" />
									{dict?.platform?.addGoogleAccount ?? "Add Google Account"}
								</Button>
							) : (
								<GoogleOAuthConfigButton
									fullWidth
									className="!min-h-11 !w-full 2xl:!min-h-9 2xl:!w-auto"
								/>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-6">
					{(!googleAccounts || googleAccounts.length === 0) && (
						<div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-4 bg-muted">
							<div>
								<div className="font-medium text-card-foreground">
									{googleOAuthConfigured
										? (dict?.platform?.noGoogleAccountsConnected ??
											"No Google accounts connected")
										: "Google OAuth is not configured"}
								</div>

								<div className="text-xs text-card-foreground mt-1">
									{googleOAuthConfigured
										? (dict?.platform?.connectGmailOrWorkspace ??
											"Connect Gmail or Google Workspace to send and sync mail.")
										: "Configure your Google OAuth application before connecting accounts."}
								</div>
							</div>

							{googleOAuthConfigured ? (
								<div className="w-full sm:w-fit">
									<Button
										fullWidth
										variant="default"
										size="sm"
										className="!h-auto !min-h-9 gap-2 !py-2"
										classNames={{ label: "!whitespace-normal text-center" }}
										component="a"
										href="/api/oauth/google/connect"
									>
										<Plus className="h-4 w-4" />
										{dict?.platform?.addGoogleAccount ?? "Add Google Account"}
									</Button>
								</div>
							) : (
								<div className="w-full sm:w-fit">
									<GoogleOAuthConfigButton fullWidth />
								</div>
							)}
						</div>
					)}

					<div className="grid grid-cols-1 gap-4">
						{!!googleAccounts?.length &&
							googleAccounts.map((googleAccount) => (
								<GoogleAccountCard
									key={googleAccount.id}
									googleAccount={googleAccount}
								/>
							))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
