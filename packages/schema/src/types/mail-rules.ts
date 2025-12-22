export const mailRulesLogicList = ["all", "any"] as const;

export const mailRulesFieldsList = [
    "from",
    "to",
    "cc",
    "bcc",
    "reply_to",
    "subject",
    "text",
    "snippet",
    "list_id",
    "subscription_key",
    "has_attachments",
    "size_bytes",
] as const;

export const mailRulesOpsList = [
    "exists",
    "not_exists",
    "eq",
    "not_eq",
    "contains",
    "not_contains",
    "starts_with",
    "ends_with",
    "regex",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "not_in",
] as const;

export const mailRulesActionsList = [
    "mark_read",
    "flag",
    "add_label",
    "trash",
] as const;


export type MailRuleMatchV1 = {
    version: 1;
    logic: (typeof mailRulesLogicList)[number];
    conditions: Array<{
        field: (typeof mailRulesFieldsList)[number];
        op: (typeof mailRulesOpsList)[number];
        value?: any;
    }>;
};
