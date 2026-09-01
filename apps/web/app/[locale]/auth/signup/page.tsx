import * as React from "react";

import { type Locale } from "@/lib/dictionaries";

import { DISTRIBUTION_CONFIG } from "@distribution/config";
import { DISTRIBUTION_PAGES } from "@distribution/pages";

type SignupPageProps = {
	params: Promise<{ locale: Locale }>;
};

export default function SignupPage(props: SignupPageProps) {
	return <DISTRIBUTION_PAGES.SignupPage {...props} />;
}

export function generateStaticParams() {
	return DISTRIBUTION_CONFIG.locales.map((locale) => ({
		locale,
	}));
}
