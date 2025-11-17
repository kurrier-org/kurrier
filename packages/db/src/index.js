"use strict";
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (
					!desc ||
					("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
				) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __exportStar =
	(this && this.__exportStar) ||
	function (m, exports) {
		for (var p in m)
			if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
				__createBinding(exports, m, p);
	};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
__exportStar(require("./drizzle/drizzle-client"), exports);
__exportStar(require("./drizzle/vault"), exports);
__exportStar(require("./drizzle/drizzle-types"), exports);
__exportStar(require("./drizzle/schema"), exports);
__exportStar(require("./drizzle/helpers"), exports);
var init_db_1 = require("./drizzle/init-db");
Object.defineProperty(exports, "db", {
	enumerable: true,
	get: function () {
		return init_db_1.db;
	},
});
