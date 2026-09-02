import { type NextRequest, NextResponse } from "next/server";
import { LOCALES } from "@/lib/locale";
import { updateSession } from "@/lib/supabase/middleware";
import { DISTRIBUTION_CONFIG } from "@distribution/config";

const locales = LOCALES;
const defaultLocale = DISTRIBUTION_CONFIG.defaultLocale;

function normalizeLocale(tag: string): string | null {
	const lower = tag.toLowerCase();
	const exact = locales.find((l) => l.toLowerCase() === lower);

	if (exact) return exact;

	const primary = lower.split("-")[0];

	return locales.find(
		(l) => l.toLowerCase().split("-")[0] === primary,
	) ?? null;
}

function getRedirectLocale(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	const pathnameHasLocale = locales.some(
		(locale) =>
			pathname === `/${locale}` ||
			pathname.startsWith(`/${locale}/`),
	);

	if (pathnameHasLocale) return null;

	const cookieLocale = request.cookies.get("locale")?.value;

	const acceptLanguageTag = request.headers
		.get("accept-language")
		?.split(",")[0];

	return (
		(cookieLocale && normalizeLocale(cookieLocale)) ||
		(acceptLanguageTag && normalizeLocale(acceptLanguageTag)) ||
		defaultLocale
	);
}

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname;

	if (pathname.startsWith("/api")) {
		return await updateSession(request);
	}

	if ( pathname === "/distribution" || pathname.startsWith("/distribution/")) {
		return await updateSession(request);
	}

	const pathnameHasLocale = locales.some(
		(locale) =>
			pathname === `/${locale}` ||
			pathname.startsWith(`/${locale}/`),
	);

	if (pathnameHasLocale) {
		return await updateSession(request);
	}

	const requiresLocale =
		pathname === "/auth" ||
		pathname.startsWith("/auth/") ||
		pathname === "/w" ||
		pathname.startsWith("/w/");

	if (requiresLocale) {
		const redirectLocale = getRedirectLocale(request);

		if (redirectLocale) {
			const url = request.nextUrl.clone();
			url.pathname = `/${redirectLocale}${pathname}`;

			return NextResponse.redirect(url);
		}

		return await updateSession(request);
	}

	const url = request.nextUrl.clone();
	url.pathname =
		pathname === "/"
			? "/distribution"
			: `/distribution${pathname}`;

	return NextResponse.rewrite(url);
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
