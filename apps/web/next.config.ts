import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	devIndicators: false,
	output: "standalone",
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
				{
					source: "/api/kurrier/:path*",
					destination: `${process.env.WORKER_URL}:3001/api/kurrier/:path*`,
				},

                {
                    source: '/.well-known/caldav',
                    destination: `${process.env.RADICALE_URL}/:path*`,
                },
                {
                    source: '/.well-known/carddav',
                    destination: `${process.env.RADICALE_URL}/:path*`,
                },
                {
                    source: "/api/dav/:path*",
                    destination: `${process.env.RADICALE_URL}/:path*`,
                },
			],
			afterFiles: [],
			fallback: [],
		};
	},
};

export default nextConfig;
