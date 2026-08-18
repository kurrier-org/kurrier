"use server";

import { cookies } from "next/headers";
import { hasLocale } from "@/lib/dictionaries";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocaleServer(locale: unknown) {
	const value = typeof locale === "string" && hasLocale(locale) ? locale : "en";
	(await cookies()).set("locale", value, {
		path: "/",
		sameSite: "lax",
		maxAge: ONE_YEAR,
	});
	return value;
}
