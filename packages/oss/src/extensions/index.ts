import type { KurrierExtension } from "@extensions";

import { singleWorkspaceServerExtension } from "./single-workspace/server";
import { singleWorkspaceWebExtension } from "./single-workspace/web";

export const serverExtensions = [
    singleWorkspaceServerExtension,
] satisfies KurrierExtension[];

export const webExtensions = [
    singleWorkspaceWebExtension,
] satisfies KurrierExtension[];
