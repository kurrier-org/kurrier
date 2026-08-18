ALTER TYPE "public"."provider_kind" ADD VALUE 'inbound';
INSERT INTO "providers" (
    "owner_id",
    "workspace_id",
    "type"
)
SELECT DISTINCT
    "owner_id",
    "workspace_id",
    'inbound'::"public"."provider_kind"
FROM "providers"
    ON CONFLICT ("owner_id", "type", "workspace_id")
DO NOTHING;
