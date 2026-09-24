import type { NextConfig } from "next";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || "/";
const nextConfig: NextConfig = {
	assetPrefix,
	devIndicators: { position: "top-right" },
	experimental: {
		serverActions: {
			bodySizeLimit: "20mb",
		},
	},
	output: "standalone",
	cacheComponents: true,
	partialPrefetching: true,
	serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
	reactCompiler: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
			{
				protocol: "http",
				hostname: "**",
			},
		],
	},
	async rewrites() {
		return {
			beforeFiles: [
				{
					source: "/api/v1/:path*",
					destination: `${process.env.WORKER_URL}/api/v1/:path*`,
				},
				{
					source: "/api/kurrier/:path*",
					destination: `${process.env.WORKER_URL}/api/kurrier/:path*`,
				},

				{
					source: "/api/dav",
					destination: `${process.env.DAV_URL}/dav.php`,
				},
				{
					source: "/api/dav/:path*",
					destination: `${process.env.DAV_URL}/dav.php/:path*`,
				},
				{
					source: "/dav.php/:path*",
					destination: `${process.env.DAV_URL}/dav.php/:path*`,
				},
				{
					source: "/principals/:path*",
					destination: `${process.env.DAV_URL}/dav.php/principals/:path*`,
				},
				{
					source: "/.well-known/caldav",
					destination: `${process.env.DAV_URL}/dav.php`,
				},
				{
					source: "/.well-known/carddav",
					destination: `${process.env.DAV_URL}/dav.php`,
				},
			],
			afterFiles: [],
			fallback: [],
		};
	},
};

export default nextConfig;
