import { defineNitroConfig } from "nitropack/config";

// https://nitro.build/config
export default defineNitroConfig({
	compatibilityDate: "latest",
	// preset: 'node-server',
	srcDir: "server",
	imports: false,
	alias: {
		"@db": "../../packages/db/src/index.ts",
		"@db/*": "../../packages/db/src/*",
		"@schema": "../../packages/schema/src/index.ts",
		"@schema/*": "../../packages/schema/src/*",
		"@providers": "../../packages/providers/src/index.ts",
		"@providers/*": "../../packages/providers/src/*",
		"@common": "../../packages/common/src/index.ts",
		"@common/*": "../../packages/common/src/*",
		"@common/mail-client": "../../packages/common/src/mail-client.ts",
		"@jmap": "../../packages/jmap/src/index.ts",
		"@jmap/*": "../../packages/jmap/src/*",
		"@distribution/kurrier-server": "../../packages/distribution/src/kurrier-server.ts",
		"@extensions": "../../packages/extensions/src/index.ts",
		"@extensions/*": "../../packages/extensions/src/*",
	},
	externals: {
		inline: ["@db", "@schema", "@providers", "@common", "@common/mail-client", "@jmap", "@distribution/kurrier-server", "@extensions"],
	},
	routeRules: {
		"/**": {
			cors: true,
		},
	},
});
