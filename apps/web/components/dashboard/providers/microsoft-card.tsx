"use client";
import { Button } from "@mantine/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export default function MicrosoftCard({ configured }: { configured: boolean }) {
	return (
		<Card className="shadow-none border-border">
			<CardHeader>
				<CardTitle>Microsoft 365</CardTitle>
				<p className="text-sm text-muted-foreground">
					Connect Outlook and Microsoft 365 mailboxes with delegated OAuth.
				</p>
			</CardHeader>
			<CardContent>
				{configured ? (
					<Button component="a" href="/api/oauth/microsoft/connect">
						Connect Microsoft mailbox
					</Button>
				) : (
					<p className="text-sm text-muted-foreground">
						Microsoft OAuth is not configured by your administrator.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
