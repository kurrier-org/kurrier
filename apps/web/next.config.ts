import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	devIndicators: false,
	output: "standalone",
	// cacheComponents: true,
	reactCompiler: true,
	async rewrites() {
		return {
			beforeFiles: [
				{
					source: "/api/kong/:path*",
					destination: `${process.env.API_URL}/:path*`,
				},
				{
					source: "/api/v1/:path*",
					destination: `${process.env.WORKER_URL}:3001/api/v1/:path*`,
				},
			],
			afterFiles: [],
			fallback: [],
		};
	},
};

export default nextConfig;
