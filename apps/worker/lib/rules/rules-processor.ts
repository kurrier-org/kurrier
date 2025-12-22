import { db, identities, mailboxes, messages, mailRules, mailRuleActions, threads, mailboxThreadLabels } from "@db";
import { and, asc, eq, inArray } from "drizzle-orm";
import { MailRuleMatchV1, mailRulesFieldsList, mailRulesOpsList } from "@schema";
import { markAsRead } from "./rule-items/mark-read";
import { toggleStar } from "./rule-items/mark-flag";
import { moveToTrash } from "./rule-items/move-to-trash";

type AddressValue = { address?: string | null; name?: string | null };
type AddressObjectLike =
    | string
    | null
    | undefined
    | { text?: string; html?: string; value?: AddressValue[] }
    | AddressValue[]
    | { address?: string | null }
    | Array<any>;

function extractEmails(v: AddressObjectLike) {
    const out: string[] = [];

    const pushEmail = (e: unknown) => {
        const s = typeof e === "string" ? e : "";
        if (!s) return;
        const m = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
        for (const x of m) out.push(x.toLowerCase());
    };

    const walk = (x: any) => {
        if (x === null || x === undefined) return;

        if (typeof x === "string") {
            pushEmail(x);
            return;
        }

        if (Array.isArray(x)) {
            for (const item of x) walk(item);
            return;
        }

        if (typeof x === "object") {
            if (typeof x.address === "string" && x.address.includes("@")) {
                out.push(x.address.trim().toLowerCase());
            }

            if (Array.isArray(x.value)) {
                for (const item of x.value) {
                    if (typeof item?.address === "string" && item.address.includes("@")) {
                        out.push(item.address.trim().toLowerCase());
                    }
                }
            }

            if (typeof x.text === "string") pushEmail(x.text);
            return;
        }
    };

    walk(v);

    return Array.from(new Set(out)).join(", ");
}

function getMessageFieldValue(message: any, field: MailRuleField) {
    switch (field) {
        case "from":
            return extractEmails(message.from ?? message.headersJson?.from);
        case "to":
            return extractEmails(message.to ?? message.headersJson?.to);
        case "cc":
            return extractEmails(message.cc ?? message.headersJson?.cc);
        case "bcc":
            return extractEmails(message.bcc ?? message.headersJson?.bcc);
        case "reply_to":
            return extractEmails(message.replyTo ?? message.reply_to ?? message.headersJson?.["reply-to"]);
        case "subject":
            return message.subject ?? "";
        case "text":
            return message.text ?? "";
        case "snippet":
            return message.snippet ?? "";
        case "list_id":
            return message.listId ?? message.list_id ?? "";
        case "subscription_key":
            return message.subscriptionKey ?? message.subscription_key ?? "";
        case "has_attachments":
            return message.hasAttachments ?? message.has_attachments ?? false;
        case "size_bytes":
            return message.sizeBytes ?? message.size_bytes ?? message.rawSizeBytes ?? 0;
        default:
            return "";
    }
}





type MailRuleField = (typeof mailRulesFieldsList)[number];
type MailRuleOp = (typeof mailRulesOpsList)[number];

type MatchCondition = MailRuleMatchV1["conditions"][number];

function asLowerString(v: unknown) {
    if (v === null || v === undefined) return "";
    return String(v).trim().toLowerCase();
}

function isEmptyValue(v: unknown) {
    return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function toNumber(v: unknown) {
    const n = typeof v === "number" ? v : Number(String(v));
    return Number.isFinite(n) ? n : 0;
}

function toBool(v: unknown) {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    const s = asLowerString(v);
    if (s === "true") return true;
    if (s === "false") return false;
    return Boolean(s);
}

function tryRegex(pattern: string) {
    try {
        return new RegExp(pattern, "i");
    } catch {
        return null;
    }
}



function evalCondition(message: any, c: MatchCondition): boolean {
    const left = getMessageFieldValue(message, c.field);
    const op = c.op as MailRuleOp;
    const right = c.value;

    if (op === "exists") return !isEmptyValue(left);
    if (op === "not_exists") return isEmptyValue(left);

    if (c.field === "has_attachments") {
        const l = toBool(left);
        const r = toBool(right);
        if (op === "eq") return l === r;
        if (op === "not_eq") return l !== r;
        return false;
    }

    if (c.field === "size_bytes") {
        const l = toNumber(left);
        const r = toNumber(right);
        if (op === "eq") return l === r;
        if (op === "not_eq") return l !== r;
        if (op === "gt") return l > r;
        if (op === "gte") return l >= r;
        if (op === "lt") return l < r;
        if (op === "lte") return l <= r;
        if (op === "in") return Array.isArray(right) ? right.map(toNumber).includes(l) : false;
        if (op === "not_in") return Array.isArray(right) ? !right.map(toNumber).includes(l) : false;
        return false;
    }

    const l = asLowerString(left);
    const rStr = asLowerString(right);

    if (op === "eq") return l === rStr;
    if (op === "not_eq") return l !== rStr;
    if (op === "contains") return rStr ? l.includes(rStr) : false;
    if (op === "not_contains") return rStr ? !l.includes(rStr) : true;
    if (op === "starts_with") return rStr ? l.startsWith(rStr) : false;
    if (op === "ends_with") return rStr ? l.endsWith(rStr) : false;

    if (op === "regex") {
        const re = rStr ? tryRegex(String(right)) : null;
        return re ? re.test(String(left ?? "")) : false;
    }

    if (op === "in") {
        if (!Array.isArray(right)) return false;
        const set = right.map(asLowerString);
        return set.includes(l);
    }

    if (op === "not_in") {
        if (!Array.isArray(right)) return true;
        const set = right.map(asLowerString);
        return !set.includes(l);
    }

    return false;
}

function evalMatch(message: any, match: MailRuleMatchV1): boolean {
    const results = match.conditions.map((c) => evalCondition(message, c));
    return match.logic === "any" ? results.some(Boolean) : results.every(Boolean);
}

export const processRules = async ({ messageId }: { messageId: string }) => {
    console.info("[COMMON] Processing rules for message:", messageId);

    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    if (!message) return;

    const [mailbox] = await db.select().from(mailboxes).where(eq(mailboxes.id, message.mailboxId));
    if (!mailbox) return;

    const [thread] = await db.select().from(threads).where(eq(threads.id, message.threadId));
    if (!thread) return;

    const [identity] = await db.select().from(identities).where(eq(identities.id, mailbox.identityId));
    if (!identity) return;

    const rules = await db
        .select()
        .from(mailRules)
        .where(and(eq(mailRules.identityId, identity.id), eq(mailRules.enabled, true)))
        .orderBy(asc(mailRules.priority));

    if (!rules.length) return;

    const ruleIds = rules.map((r) => r.id);

    const actions = await db
        .select()
        .from(mailRuleActions)
        .where(inArray(mailRuleActions.ruleId, ruleIds))
        .orderBy(asc(mailRuleActions.ruleId), asc(mailRuleActions.order));


    const actionsByRuleId = new Map<string, typeof actions>();
    for (const a of actions) {
        const list = actionsByRuleId.get(a.ruleId) ?? [];
        list.push(a);
        actionsByRuleId.set(a.ruleId, list);
    }

    for (const rule of rules) {
        const match = rule.match as MailRuleMatchV1;
        if (!match?.conditions?.length) continue;

        const ok = evalMatch(message, match);
        if (!ok) continue;

        const ruleActions = actionsByRuleId.get(rule.id) ?? [];

        for (const act of ruleActions) {
            switch (act.actionType) {
                case "mark_read": {
                    await markAsRead(thread.id, mailbox.id, identity.smtpAccountId);
                    break;
                }
                case "flag": {
                    await toggleStar(thread.id, mailbox.id, true, identity.smtpAccountId);
                    break;
                }
                case "trash": {
                    await moveToTrash(thread.id, mailbox.id, identity.smtpAccountId, message.id);
                    break;
                }
                case "add_label": {
                    const labelId = (act.params as any)?.labelId as string | undefined;
                    if (!labelId) break;
                    await db.insert(mailboxThreadLabels).values({
                        threadId: thread.id,
                        mailboxId: mailbox.id,
                        ownerId: mailbox.ownerId,
                        labelId,
                    })
                    break;
                }
                default: {
                    break;
                }
            }
        }

        if (rule.stopProcessing) break;
    }
};
