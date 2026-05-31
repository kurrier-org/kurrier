import { PgDatabase } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { jwtDecode, JwtPayload } from "jwt-decode";
import { db, db_rls } from "./init-db";

export function decode(accessToken: string) {
	try {
		return jwtDecode<JwtPayload & { role: string }>(accessToken);
	} catch {
		return { role: "anon" } as JwtPayload & { role: string };
	}
}

type Token = {
	sub?: string;
	iat?: number;
	workspace_id?: string;
};

export function createDrizzle<Database extends PgDatabase<any, any, any>>(
	token: Token,
	ctx: { workspaceId?: string },
	{ admin, client }: { admin: Database; client: Database },
) {
	return {
		admin,
		rls: (async (transaction, ...rest) => {
			return client.transaction(async (tx) => {
				const claims: Token = {
					...token,
					workspace_id: ctx.workspaceId ?? token.workspace_id,
				};

				if (claims.sub) {
					await tx.execute(
						sql`select set_config('request.jwt.claim.sub', ${claims.sub}, true)`
					);
				}

				if (claims.workspace_id) {
					await tx.execute(
						sql`select set_config('request.jwt.claim.workspace_id', ${claims.workspace_id}, true)`
					);
				}

				return transaction(tx);
			}, ...rest);
		}) as typeof client.transaction,
	};
}

export async function createDrizzleClientInstance(
	session: string,
	ctx: { workspaceId?: string },
) {
	return createDrizzle(decode(session ?? ""), ctx, {
		admin: db,
		client: db_rls,
	});
}
