import "@/app/global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Inter } from "next/font/google";

const inter = Inter({
	subsets: ["latin"],
});

export const metadata = {
	title: {
		default: "Kurrier Instant webmail for any email provider",
		template: "%s | Kurrier Docs",
	},
	description:
		"Self-hosted email web client with IMAP, SMTP, SES, Mailgun, Postmark, Sendgrid provider integrations.",
	keywords: [
		"Kurrier",
		"email",
		"self-hosted",
		"IMAP",
		"SMTP",
		"open source",
		"postmark",
		"mailgun",
		"sendgrid",
		"ses",
		"webmail",
	],
	openGraph: {
		title: "Kurrier Instant webmail",
		description: "Your own self-hosted webmail platform.",
		url: "https://www.kurrier.org",
		siteName: "Kurrier",
		images: [
			{
				url: "https://www.kurrier.org/light-mailbox.png",
				width: 1200,
				height: 630,
			},
		],
		locale: "en_US",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Kurrier Instant webmail",
		description: "Your own self-hosted webmail platform.",
		images: ["https://www.kurrier.org/light-mailbox.png"],
	},
	metadataBase: new URL("https://www.kurrier.org"),
};

export default function Layout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body className="flex flex-col min-h-screen">
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}
