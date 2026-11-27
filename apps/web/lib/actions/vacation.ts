"use server";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { isSignedIn } from "./auth";
import { getWorkspaceId, requireWorkspaceAccess } from "./clients";

async function authorize(identityId: string) {
	const user = await isSignedIn();
	if (!user) throw new Error("Sign in required");
	const workspaceId = await getWorkspaceId();
	await requireWorkspaceAccess(workspaceId);
	const rows = await db.execute(sql`
  SELECT i.id,p.type,i.smtp_account_id FROM identities i
  LEFT JOIN providers p ON p.id=i.provider_id
  WHERE i.id=${identityId} AND i.workspace_id=${workspaceId} AND i.kind='email'
  AND (i.owner_id=${user.id} OR EXISTS (
   SELECT 1 FROM workspace_members w WHERE w.workspace_id=i.workspace_id
   AND w.user_id=${user.id} AND w.role IN ('owner','admin')))
 `);
	if (!rows[0]) throw new Error("Identity not found or no management access");
	return { identity: rows[0], workspaceId };
}

export async function getVacationSettings(identityId: string) {
	await authorize(identityId);
	const rows = await db.execute(
		sql`SELECT enabled,subject,message,starts_at,ends_at FROM vacation_settings WHERE identity_id=${identityId}`,
	);
	return rows[0]
		? (JSON.parse(JSON.stringify(rows[0])) as VacationSettings)
		: null;
}
export type VacationSettings = {
	enabled: boolean;
	subject: string;
	message: string;
	starts_at: string | null;
	ends_at: string | null;
};

export async function saveVacationSettings(
	identityId: string,
	input: VacationSettings,
) {
	const { identity, workspaceId } = await authorize(identityId);
	const data = z
		.object({
			enabled: z.boolean(),
			subject: z
				.string()
				.max(200)
				.refine((s) => !/[\r\n]/.test(s)),
			message: z.string().max(10000),
			starts_at: z.string().datetime().nullable(),
			ends_at: z.string().datetime().nullable(),
		})
		.parse(input);
	if (data.enabled && (!data.subject.trim() || !data.message.trim()))
		throw new Error("Subject and message are required");
	if (data.starts_at && data.ends_at && data.ends_at <= data.starts_at)
		throw new Error("End must follow start");
	if (data.enabled && !identity.smtp_account_id && identity.type !== "mailgun")
		throw new Error("Vacation replies currently require SMTP/IMAP or Mailgun");
	if (
		data.enabled &&
		identity.type === "mailgun" &&
		!process.env.MAILGUN_WEBHOOK_SIGNING_KEY
	)
		throw new Error(
			"Configure MAILGUN_WEBHOOK_SIGNING_KEY in the shared development environment first",
		);
	await db.execute(sql`
  INSERT INTO vacation_settings(identity_id,workspace_id,enabled,subject,message,starts_at,ends_at)
  VALUES (${identityId},${workspaceId},${data.enabled},${data.subject},${data.message},${data.starts_at},${data.ends_at})
  ON CONFLICT(identity_id) DO UPDATE SET
   period_id=CASE WHEN excluded.enabled AND (NOT vacation_settings.enabled OR vacation_settings.ends_at<=now())
    THEN gen_random_uuid() ELSE vacation_settings.period_id END,
   activated_at=CASE WHEN excluded.enabled AND (NOT vacation_settings.enabled OR vacation_settings.ends_at<=now())
    THEN now() ELSE vacation_settings.activated_at END,
   enabled=excluded.enabled,subject=excluded.subject,message=excluded.message,
   starts_at=excluded.starts_at,ends_at=excluded.ends_at
 `);
}
