import {type NextRequest, NextResponse} from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const locales = ["en", "ko"];
const defaultLocale = "en";

function getRedirectLocale(request: NextRequest) {

	const pathname = request.nextUrl.pathname;
	const pathnameHasLocale = locales.some(
		(locale) =>
			pathname === `/${locale}` ||
			pathname.startsWith(`/${locale}/`),
	);
	if (pathnameHasLocale) return null;
	const locale =
		request.cookies.get("locale")?.value ||
		request.headers.get("accept-language")?.split(",")[0]?.split("-")[0] ||
		defaultLocale;
	return locales.includes(locale) ? locale : defaultLocale;

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
