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
	return locales.find((l) => l.toLowerCase().split("-")[0] === primary) ?? null;
}

function getRedirectLocale(request: NextRequest) {
	const pathname = request.nextUrl.pathname;
	const pathnameHasLocale = locales.some(
		(locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
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
	if (request.nextUrl.pathname.startsWith("/api")) {
		return await updateSession(request);
	}

	const redirectLocale = getRedirectLocale(request);

	if (redirectLocale) {
		const url = request.nextUrl.clone();
		url.pathname = `/${redirectLocale}${url.pathname}`;
		return NextResponse.redirect(url);
	}

	return await updateSession(request);
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * Feel free to modify this pattern to include more paths.
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
