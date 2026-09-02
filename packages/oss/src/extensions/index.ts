import type { KurrierExtension } from "@extensions";

import { singleWorkspaceExtension } from "./single-workspace";

export const extensions = [
    singleWorkspaceExtension,
] satisfies KurrierExtension[];
