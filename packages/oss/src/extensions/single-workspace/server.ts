import type { KurrierExtension } from "@extensions";

import { enforceSingleWorkspace } from "../../hooks/workspace/before-create";
import { logWorkspaceCreated } from "../../hooks/workspace/after-create";
import { beforeSend } from "../../hooks/mailer/before-send";

export const singleWorkspaceServerExtension = {
	manifest: {
		id: "oss.single-workspace",
		name: "Single Workspace",
	},

	hooks: {
		"workspace.beforeCreate": enforceSingleWorkspace,
		"workspace.afterCreate": logWorkspaceCreated,
		"mail.beforeSend": beforeSend,
	},
} satisfies KurrierExtension;
