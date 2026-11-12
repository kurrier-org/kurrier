import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/health";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET() {
	const report = await getHealthReport();

	return NextResponse.json(report, {
		status: report.status === "ok" ? 200 : 503,
		headers,
	});
}

export async function HEAD() {
	const report = await getHealthReport();

	return new NextResponse(null, {
		status: report.status === "ok" ? 200 : 503,
		headers,
	});
}
