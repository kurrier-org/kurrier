"use server";

import { rlsClient } from "@/lib/actions/clients";
import { mailRules, mailRuleActions } from "@db";
import { handleAction, mailRulesActionsList, mailRulesFieldsList, mailRulesOpsList } from "@schema";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { decode } from "decode-formdata";

export async function fetchMailRules(identityId: string) {
    const rls = await rlsClient();

    return rls(async (tx) => {
        const rows = await tx
            .select({ rule: mailRules, action: mailRuleActions })
            .from(mailRules)
            .leftJoin(mailRuleActions, eq(mailRuleActions.ruleId, mailRules.id))
            .where(eq(mailRules.identityId, identityId))
            .orderBy(asc(mailRules.priority), asc(mailRuleActions.order));

        const byId = new Map<
            string,
            (typeof mailRules.$inferSelect & { actions: (typeof mailRuleActions.$inferSelect)[] })
        >();

        for (const row of rows) {
            const existing =
                byId.get(row.rule.id) ??
                ({
                    ...row.rule,
                    actions: [],
                } as (typeof mailRules.$inferSelect & { actions: (typeof mailRuleActions.$inferSelect)[] }));

            if (row.action) existing.actions.push(row.action);
            byId.set(row.rule.id, existing);
        }

        return Array.from(byId.values());
    });
}

export type FetchMailRulesResult = Awaited<
    ReturnType<typeof fetchMailRules>
>;

type MailRuleField = (typeof mailRulesFieldsList)[number];
type MailRuleOp = (typeof mailRulesOpsList)[number];
type MailRuleActionType = (typeof mailRulesActionsList)[number];

export type MatchCondition = { field: MailRuleField; op: MailRuleOp; value?: unknown };
export type MatchPayload = { version: 1; logic: "all" | "any"; conditions: MatchCondition[] };
export type RuleAction = { actionType: MailRuleActionType; order: number; params: Record<string, unknown> | null };

function asString(v: FormDataEntryValue | null) {
    return typeof v === "string" ? v : "";
}

function asBool(v: FormDataEntryValue | null) {
    return asString(v) === "true";
}

function asNumber(v: FormDataEntryValue | null) {
    const n = Number(asString(v));
    return Number.isFinite(n) ? n : 0;
}

function bytesFromSize(n: number, unit: "KB" | "MB") {
    const mul = unit === "MB" ? 1024 * 1024 : 1024;
    return Math.max(0, Math.floor(n * mul));
}

function buildContains(field: MailRuleField, value: string): MatchCondition | null {
    const v = value.trim();
    if (!v) return null;
    return { field, op: "contains", value: v };
}

function validateRulePayload(p: {
    name: string;
    priority: number;
    match: MatchPayload;
    actions: RuleAction[];
    applyLabel: boolean;
    labelId: string;
}) {
    const errors: Record<string, string[]> = {};

    if (!p.name.trim()) errors.name = ["Rule name is required."];
    if (!Number.isFinite(p.priority) || p.priority < 0) errors.priority = ["Priority must be a non-negative number."];
    if (p.match.conditions.length === 0) errors.match = ["Add at least one criteria field."];
    if (p.actions.length === 0) errors.actions = ["Select at least one action."];
    if (p.applyLabel && !p.labelId.trim()) errors.labelId = ["Label ID is required when Apply label is enabled."];

    return errors;
}

export async function buildRulePayloadFromFormData(formData: FormData) {
    const from = asString(formData.get("from"));
    const to = asString(formData.get("to"));
    const subject = asString(formData.get("subject"));
    const hasWords = asString(formData.get("hasWords"));
    const doesntHave = asString(formData.get("doesntHave"));

    const hasAttachment = asBool(formData.get("hasAttachment"));

    const sizeOp = (asString(formData.get("sizeOp")) || "gt") as "gt" | "lt";
    const sizeValue = asNumber(formData.get("sizeValue"));
    const sizeUnit = (asString(formData.get("sizeUnit")) || "MB") as "KB" | "MB";

    // const stopProcessing = asBool(formData.get("stopProcessing"));

    const markRead = asBool(formData.get("markRead"));
    const flag = asBool(formData.get("flag"));
    const trash = asBool(formData.get("trash"));

    const applyLabel = asBool(formData.get("applyLabel"));
    const labelId = asString(formData.get("labelId")).trim();

    const conditions: MatchCondition[] = [];

    const cFrom = buildContains("from", from);
    const cTo = buildContains("to", to);
    const cSub = buildContains("subject", subject);

    if (cFrom) conditions.push(cFrom);
    if (cTo) conditions.push(cTo);
    if (cSub) conditions.push(cSub);

    if (hasWords.trim()) conditions.push({ field: "text", op: "contains", value: hasWords.trim() });
    if (doesntHave.trim()) conditions.push({ field: "text", op: "not_contains", value: doesntHave.trim() });

    if (hasAttachment) conditions.push({ field: "has_attachments", op: "eq", value: true });

    if (sizeValue > 0) {
        conditions.push({
            field: "size_bytes",
            op: sizeOp,
            value: bytesFromSize(sizeValue, sizeUnit),
        });
    }

    const match: MatchPayload = { version: 1, logic: "all", conditions };

    const actions: RuleAction[] = [];
    let order = 0;

    if (markRead) actions.push({ actionType: "mark_read", order: order++, params: null });
    if (flag) actions.push({ actionType: "flag", order: order++, params: null });
    if (trash) actions.push({ actionType: "trash", order: order++, params: null });

    if (applyLabel) actions.push({ actionType: "add_label", order: order++, params: { labelId } });

    const payload = {
        identityId: asString(formData.get("identityId")),
        name: asString(formData.get("name")),
        priority: asNumber(formData.get("priority")),
        enabled: asBool(formData.get("enabled")),
        match,
        actions,
    };

    const errors = validateRulePayload({
        name: payload.name,
        priority: payload.priority,
        match,
        actions,
        applyLabel,
        labelId,
    });

    return { ...payload, _errors: Object.keys(errors).length ? errors : null };
}

export async function createMailRule(payload: {
    identityId: string;
    name: string;
    priority: number;
    enabled: boolean;
    // stopProcessing: boolean;
    match: MatchPayload;
    actions: RuleAction[];
}) {
    const rls = await rlsClient();

    return rls(async (tx) => {
        try {
            const [rule] = await tx
                .insert(mailRules)
                .values({
                    identityId: payload.identityId,
                    name: payload.name,
                    priority: payload.priority,
                    enabled: payload.enabled,
                    match: payload.match,
                })
                .returning({ id: mailRules.id });

            if (!rule) throw new Error("Failed to create rule");

            if (payload.actions.length) {
                await tx.insert(mailRuleActions).values(
                    payload.actions.map((a) => ({
                        ruleId: rule.id,
                        actionType: a.actionType,
                        order: a.order,
                        params: a.params,
                    })),
                );
            }

            return { ok: true as const, ruleId: rule.id };
        } catch (e: any) {
            if (e?.code === "23505") {
                return {
                    ok: false as const,
                    error: "A rule with this name already exists for this identity.",
                    errors: { name: ["Rule name must be unique per identity."] },
                };
            }
            throw e;
        }
    });
}

export async function createRule(_prev: any, formData: FormData) {
    return handleAction(async () => {
        const payload = await buildRulePayloadFromFormData(formData);
        if (payload._errors) {
            const errors = payload._errors ?? {};
            const firstError =
                Object.values(errors)[0]?.[0] ?? "Validation errors occurred.";

            return {
                success: false,
                errors: payload._errors,
                error: firstError,
            };
        }

        const res = await createMailRule(payload);

        if (!res.ok) {
            return {
                success: false,
                error: res.error,
                errors: res.errors,
            };
        }

        revalidatePath("/dashboard/mail");

        return {
            success: true,
            ruleId: res.ruleId,
        };
    });
}

export async function deleteRule(_prev: any, formData: FormData) {
    return handleAction(async () => {
        const ruleId = String(formData.get("ruleId") || "");
        if (!ruleId) return { success: false, error: "Missing ruleId" };

        const rls = await rlsClient();
        await rls(async (tx) => {
            await tx.delete(mailRules).where(eq(mailRules.id, ruleId));
        });

        revalidatePath("/dashboard/mail");

        return { success: true };
    });
}

export async function toggleRule(_prev: any, formData: FormData) {
    return handleAction(async () => {
        const decodedForm = decode(formData);
        const rls = await rlsClient();
        await rls(async (tx) => {
            const [rule] = await tx
                .select().from(mailRules).where(eq(mailRules.id, String(decodedForm.ruleId)));
            if (!rule) throw new Error("Rule not found");

            await tx.update(mailRules).set({
                enabled: !rule.enabled,
            }).where(eq(mailRules.id, String(decodedForm.ruleId)));
        });
        revalidatePath(String(decodedForm.pathname));

        return { success: true };
    });
}
