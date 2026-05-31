import {eq, sql} from "drizzle-orm";
import {PgTable, PgColumn, pgPolicy} from "drizzle-orm/pg-core";

import { db } from "./init-db";
import {authUid, authWorkspaceId, providers, secretsMeta, smtpAccounts} from "./schema";
import { getSecretAdmin } from "./vault";

type FetchArgs = {
	linkTable: PgTable;
	foreignCol: PgColumn;
	secretIdCol: PgColumn;
	ownerId: string;
	parentId?: string;
};

export async function decryptAdminSecrets({
	linkTable,
	foreignCol,
	secretIdCol,
	ownerId,
	parentId,
}: FetchArgs) {
	let q = db
		.select({
			linkRow: linkTable,
			metaId: secretsMeta.id,
			provider: providers,
			smtpAccount: smtpAccounts,
		})
		.from(linkTable)
		.leftJoin(secretsMeta, eq(secretIdCol as any, secretsMeta.id))
		.leftJoin(providers, eq(foreignCol as any, providers.id))
		.leftJoin(smtpAccounts, eq(foreignCol as any, smtpAccounts.id))
		.where(eq(secretsMeta.ownerId, ownerId))
		.$dynamic();

	if (parentId) {
		q = q.where(eq(foreignCol as any, parentId));
	}

	const rows = await q;

	return Promise.all(
		rows.map(async (r) => {
			const metaId = String(r.metaId);
			const { vault } = await getSecretAdmin(metaId);

			return {
				linkRow: r.linkRow,
				metaId,
				vault,
				providerId: (r as any)?.linkRow?.providerId,
				accountId: (r as any)?.linkRow?.accountId,
				provider: r.provider,
				smtpAccount: r.smtpAccount,
			};
		}),
	);
}


export function workspaceTablePolicies(t: any) {
	return [
		// SELECT active workspace only
		pgPolicy("workspaces_select_active", {
			for: "select",
			to: "kurrier",
			using: sql`${t.id} = ${authWorkspaceId}`,
		}),

		// UPDATE only active workspace
		pgPolicy("workspaces_update_active", {
			for: "update",
			to: "kurrier",
			using: sql`${t.id} = ${authWorkspaceId}`,
			withCheck: sql`${t.id} = ${authWorkspaceId}`,
		}),

		// DELETE only active workspace (optional)
		pgPolicy("workspaces_delete_active", {
			for: "delete",
			to: "kurrier",
			using: sql`${t.id} = ${authWorkspaceId}`,
		}),

		// INSERT: allow creation freely (handled by backend logic)
		pgPolicy("workspaces_insert", {
			for: "insert",
			to: "kurrier",
			withCheck: sql`${t.ownerId} = ${authUid}`
		}),
	];
}


export function workspaceCrudPolicies<T extends { workspaceId: any }>(
	t: T,
	tableName: string,
) {
	return [
		pgPolicy(`${tableName}_select_workspace`, {
			for: "select",
			to: "kurrier",
			using: sql`${t.workspaceId} = ${authWorkspaceId}`,
		}),
		pgPolicy(`${tableName}_insert_workspace`, {
			for: "insert",
			to: "kurrier",
			withCheck: sql`${t.workspaceId} = ${authWorkspaceId}`,
		}),
		pgPolicy(`${tableName}_update_workspace`, {
			for: "update",
			to: "kurrier",
			using: sql`${t.workspaceId} = ${authWorkspaceId}`,
			withCheck: sql`${t.workspaceId} = ${authWorkspaceId}`,
		}),
		pgPolicy(`${tableName}_delete_workspace`, {
			for: "delete",
			to: "kurrier",
			using: sql`${t.workspaceId} = ${authWorkspaceId}`,
		}),
	];
}


export function identitySelectConditionForIdentities(t: any) {
	return sql`
    ${t.workspaceId} = ${authWorkspaceId}
    AND (
      ${t.kind} = 'domain'
      OR ${t.sharedWithWorkspace} = true
      OR EXISTS (
        SELECT 1
        FROM workspace_identity_members wim
        WHERE        
          wim.user_id = ${authUid}
          AND wim.identity_id = ${t.id}
      )
    )
  `;
}

export function workspaceMutationPolicies<T extends { workspaceId: any }>(
	t: T,
	tableName: string,
) {
	return [
		pgPolicy(`${tableName}_insert_workspace`, {
			for: "insert",
			to: "kurrier",
			withCheck: sql`${t.workspaceId} = ${authWorkspaceId}`,
		}),
		pgPolicy(`${tableName}_update_workspace`, {
			for: "update",
			to: "kurrier",
			using: sql`${t.workspaceId} = ${authWorkspaceId}`,
			withCheck: sql`${t.workspaceId} = ${authWorkspaceId}`,
		}),
		pgPolicy(`${tableName}_delete_workspace`, {
			for: "delete",
			to: "kurrier",
			using: sql`${t.workspaceId} = ${authWorkspaceId}`,
		}),
	];
}

export function identitySelectCondition(
	t: any,
	identityColumn: any
) {
	return sql`
    ${t.workspaceId} = ${authWorkspaceId}
    AND EXISTS (
      SELECT 1
      FROM identities i
      WHERE
        i.id = ${identityColumn}
        AND i.workspace_id = ${authWorkspaceId}
        AND (
          i.shared_with_workspace = true
          OR EXISTS (
            SELECT 1
            FROM workspace_identity_members wim
            WHERE
              wim.workspace_id = ${authWorkspaceId}
              AND wim.user_id = ${authUid}
              AND wim.identity_id = i.id
          )
        )
    )
  `;
}
