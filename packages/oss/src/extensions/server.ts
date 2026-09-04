import type { KurrierExtension } from "@extensions";

import { singleWorkspaceServerExtension } from "./single-workspace/server";

export const serverExtensions = [
    singleWorkspaceServerExtension,
] satisfies KurrierExtension[];
