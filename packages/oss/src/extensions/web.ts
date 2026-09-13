import type { KurrierExtension } from "@extensions";

import { singleWorkspaceWebExtension } from "./single-workspace/web";

export const webExtensions = [
    singleWorkspaceWebExtension,
] satisfies KurrierExtension[];
