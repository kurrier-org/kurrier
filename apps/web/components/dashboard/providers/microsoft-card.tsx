"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreVertical, Unplug } from "lucide-react";
import { Button, Badge, Menu, Modal } from "@mantine/core";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	disconnectMicrosoftAccount,
	type FetchMicrosoftAccountsResult,
} from "@/lib/actions/dashboard";

export default function MicrosoftCard({
	microsoftAccounts,
}: {
	microsoftAccounts: FetchMicrosoftAccountsResult;
}) {
	const router = useRouter();

	const [selectedAccount, setSelectedAccount] = useState<
		FetchMicrosoftAccountsResult[number] | null
	>(null);
	const [disconnecting, setDisconnecting] = useState(false);

	const handleDisconnect = async () => {
		if (!selectedAccount || disconnecting) return;

		setDisconnecting(true);

		try {
			const result = await disconnectMicrosoftAccount(selectedAccount.id);

			if (!result.success) {
				toast.error(result.error || "Unable to disconnect Microsoft account.");
				return;
			}

			toast.success(`${selectedAccount.email} has been disconnected.`);

			setSelectedAccount(null);
			router.refresh();
		} catch {
			toast.error("Something went wrong. Please try again.");
		} finally {
			setDisconnecting(false);
		}
	};

	return (
		<>
			<div className="flex min-w-0 flex-col">
				<Card className="h-full min-w-0 overflow-hidden border-border shadow-none">
					<CardHeader className="px-5 py-4 sm:h-[210px] sm:px-6">
						<div className="flex h-full flex-col">
							<div className="min-w-0 max-w-2xl">
								<CardTitle className="text-base font-semibold sm:text-lg">
									Microsoft 365
								</CardTitle>

								<p className="mt-1 text-sm leading-5 text-muted-foreground">
									Connect Microsoft 365 and Exchange Online accounts using
									OAuth.
								</p>

								<p className="mt-1 text-xs leading-5 text-muted-foreground/80">
									Send and synchronize email securely using Microsoft IMAP and
									SMTP.
								</p>
							</div>

							<div className="mt-4 w-full sm:mt-auto sm:w-auto sm:self-start">
								<Button
									fullWidth
									size="sm"
									className="!min-h-11 !w-full sm:!min-h-10 sm:!w-auto sm:!px-5"
									component="a"
									href="/api/oauth/microsoft"
									leftSection={<Plus className="size-4" />}
								>
									Add Microsoft Account
								</Button>
							</div>
						</div>
					</CardHeader>

					<CardContent className="space-y-4 border-t px-5 py-4 sm:px-6">
						{microsoftAccounts.length === 0 ? (
							<div className="flex flex-col items-center gap-4 rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center">
								<div>
									<p className="text-sm font-medium text-foreground">
										No Microsoft accounts connected
									</p>

									<p className="mt-1 text-xs leading-5 text-muted-foreground">
										Connect Microsoft 365 to send and synchronize mail.
									</p>
								</div>

								<Button
									variant="default"
									size="sm"
									component="a"
									href="/api/oauth/microsoft"
									leftSection={<Plus className="size-4" />}
								>
									Add Microsoft Account
								</Button>
							</div>
						) : (
							<div className="grid grid-cols-1 gap-4">
								{microsoftAccounts.map((account) => (
									<div
										key={account.id}
										className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-4"
									>
										<div className="min-w-0">
											<p className="truncate text-sm font-medium">
												{account.name || account.email}
											</p>

											<p className="truncate text-xs text-muted-foreground">
												{account.email}
											</p>
										</div>

										<div className="flex shrink-0 items-center gap-2">
											<Badge
												size="sm"
												color={
													account.status === "connected"
														? "green"
														: account.status === "revoked"
															? "red"
															: "yellow"
												}
												variant="light"
											>
												{account.status}
											</Badge>

											<Menu
												position="bottom-end"
												withinPortal
												shadow="md"
												width={180}
											>
												<Menu.Target>
													<button
														type="button"
														className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
														aria-label={`Options for ${account.email}`}
													>
														<MoreVertical className="size-4" />
													</button>
												</Menu.Target>

												<Menu.Dropdown>
													<Menu.Item
														color="red"
														leftSection={<Unplug className="size-4" />}
														onClick={() => setSelectedAccount(account)}
													>
														Disconnect
													</Menu.Item>
												</Menu.Dropdown>
											</Menu>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Modal
				opened={selectedAccount !== null}
				onClose={() => {
					if (!disconnecting) setSelectedAccount(null);
				}}
				title="Disconnect Microsoft Account"
				centered
				closeOnClickOutside={!disconnecting}
				closeOnEscape={!disconnecting}
				withCloseButton={!disconnecting}
			>
				<div className="space-y-5">
					<div className="my-2">
						Are you sure you want to disconnect{" "}
						<strong>{selectedAccount?.email}</strong>?
					</div>

					<div className="my-2">
						Kurrier will lose access to this Microsoft account. Your emails and
						mailbox in Microsoft will not be deleted.
					</div>

					<div className="my-4 flex justify-end gap-2">
						<Button
							variant="default"
							color="gray"
							disabled={disconnecting}
							onClick={() => setSelectedAccount(null)}
						>
							Cancel
						</Button>

						<Button
							color="red"
							loading={disconnecting}
							onClick={handleDisconnect}
						>
							Disconnect
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
