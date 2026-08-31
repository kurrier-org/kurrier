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
			<Card className="h-full min-w-0 overflow-hidden border-border shadow-none">
				<CardHeader className="px-5 py-4 sm:h-[210px] sm:px-6">
					<div className="flex h-full flex-col">
						<div className="min-w-0 max-w-2xl">
							<CardTitle className="text-base font-semibold sm:text-lg">
								{dict?.platform?.providerNameGoogle ?? GOOGLE_SPEC.name}
							</CardTitle>

							<p className="mt-1 text-sm leading-5 text-muted-foreground">
								{dict?.platform?.connectGmailDescription ??
									"Connect Gmail and Google Workspace accounts using OAuth."}
							</p>

							<p className="mt-1 text-xs leading-5 text-muted-foreground/80">
								{dict?.platform?.googleSpecHelp ?? GOOGLE_SPEC.help}
							</p>
						</div>

						<div className="mt-4 w-full sm:mt-auto sm:w-auto sm:self-start">
							{googleOAuthConfigured ? (
								<Button
									fullWidth
									size="sm"
									className="!min-h-11 !w-full sm:!min-h-10 sm:!w-auto sm:!px-5"
									component="a"
									href="/api/oauth/google/connect"
									leftSection={<Plus className="size-4" />}
								>
									{dict?.platform?.addGoogleAccount ?? "Add Google Account"}
								</Button>
							) : (
								<GoogleOAuthConfigButton
									fullWidth
									className="!min-h-11 !w-full sm:!min-h-10 sm:!w-auto"
								/>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4 border-t px-5 py-4 sm:px-6">
					{(!googleAccounts || googleAccounts.length === 0) && (
						<div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
							<div>
								<div className="text-sm font-medium text-foreground">
									{googleOAuthConfigured
										? (dict?.platform?.noGoogleAccountsConnected ??
											"No Google accounts connected")
										: "Google OAuth is not configured"}
								</div>

								<div className="mt-1 text-xs leading-5 text-muted-foreground">
									{googleOAuthConfigured
										? (dict?.platform?.connectGmailOrWorkspace ??
											"Connect Gmail or Google Workspace to send and sync mail.")
										: "Configure your Google OAuth application before connecting accounts."}
								</div>
							</div>

							{googleOAuthConfigured ? (
								<div className="w-full sm:w-auto">
									<Button
										fullWidth
										variant="default"
										size="sm"
										className="!min-h-10 !w-full sm:!w-auto"
										component="a"
										href="/api/oauth/google/connect"
										leftSection={<Plus className="size-4" />}
									>
										{dict?.platform?.addGoogleAccount ??
											"Add Google Account"}
									</Button>
								</div>
							) : (
								<div className="w-full sm:w-auto">
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
