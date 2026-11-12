import type { HookHandler } from "@schema";

export const beforeSend: HookHandler<"mail.beforeSend"> = async () => {
	return undefined;
};
