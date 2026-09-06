import * as React from "react";

import { type Locale } from "@/lib/dictionaries";
import { DISTRIBUTION_CONFIG } from "@distribution/config";
import { DISTRIBUTION_PAGES } from "@distribution/pages";

type LoginPageProps = {
	params: Promise<{ locale: Locale }>;
	searchParams: Promise<{ message?: string }>;
};

export default function LoginPage(props: LoginPageProps) {
	return <DISTRIBUTION_PAGES.LoginPage {...props} />;
}

export function generateStaticParams() {
	return DISTRIBUTION_CONFIG.locales.map((locale) => ({
		locale,
	}));
}
