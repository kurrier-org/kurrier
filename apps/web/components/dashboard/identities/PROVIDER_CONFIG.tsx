import { Providers } from "@schema";

export const PROVIDER_CONFIG: Record<
	Providers,
	{
		name: string;
		dot: string;
		chip: string;
		chipDark: string;
		textDark: string;
	}
> = {
	s3: {
		name: "AWS S3",
		dot: "bg-orange-500",
		chip: "bg-orange-50 border-orange-200 text-orange-700",
		chipDark: "dark:bg-orange-500/10 dark:border-orange-900/40",
		textDark: "dark:text-orange-300",
	},
	ses: {
		name: "Amazon SES",
		dot: "bg-orange-500",
		chip: "bg-orange-50 border-orange-200 text-orange-700",
		chipDark: "dark:bg-orange-500/10 dark:border-orange-900/40",
		textDark: "dark:text-orange-300",
	},
	sendgrid: {
		name: "SendGrid",
		dot: "bg-blue-500",
		chip: "bg-blue-50 border-blue-200 text-blue-700",
		chipDark: "dark:bg-blue-500/10 dark:border-blue-900/40",
		textDark: "dark:text-blue-300",
	},
	mailgun: {
		name: "Mailgun",
		dot: "bg-red-500",
		chip: "bg-red-50 border-red-200 text-red-700",
		chipDark: "dark:bg-red-500/10 dark:border-red-900/40",
		textDark: "dark:text-red-300",
	},
	postmark: {
		name: "Postmark",
		dot: "bg-yellow-500",
		chip: "bg-yellow-50 border-yellow-200 text-yellow-700",
		chipDark: "dark:bg-yellow-500/10 dark:border-yellow-900/30",
		textDark: "dark:text-yellow-300",
	},
	smtp: {
		name: "Custom SMTP",
		dot: "bg-gray-500",
		chip: "bg-gray-50 border-gray-200 text-gray-700",
		chipDark: "dark:bg-gray-500/10 dark:border-gray-900/40",
		textDark: "dark:text-gray-300",
	},
};
