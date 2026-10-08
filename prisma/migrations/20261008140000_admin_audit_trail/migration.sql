BEGIN;

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "eventType" VARCHAR(64) NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "actorRole" VARCHAR(32) NOT NULL,
  "actorName" VARCHAR(250) NOT NULL,
  "entityType" VARCHAR(64) NOT NULL,
  "entityId" TEXT NOT NULL,
  "affectedUserId" TEXT,
  "affectedName" VARCHAR(250),
  "before" JSONB,
  "after" JSONB,
  "reason" VARCHAR(1000),
  "deduplicationKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditEvent_identity_check" CHECK (length("actorUserId") > 0 AND length("actorRole") > 0 AND length("entityId") > 0 AND length("deduplicationKey") > 0),
  CONSTRAINT "AuditEvent_payload_object_check" CHECK (("before" IS NULL OR jsonb_typeof("before")='object') AND ("after" IS NULL OR jsonb_typeof("after")='object'))
);
CREATE UNIQUE INDEX "AuditEvent_deduplicationKey_key" ON "AuditEvent"("deduplicationKey");
CREATE INDEX "AuditEvent_createdAt_id_idx" ON "AuditEvent"("createdAt" DESC,"id" DESC);
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId","createdAt" DESC);
CREATE INDEX "AuditEvent_eventType_createdAt_idx" ON "AuditEvent"("eventType","createdAt" DESC);
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType","entityId","createdAt" DESC);
CREATE INDEX "AuditEvent_affectedUserId_createdAt_idx" ON "AuditEvent"("affectedUserId","createdAt" DESC);

-- No cascading FK to mutable accounts or domain records: deletion must not erase history.
CREATE FUNCTION "reject_audit_event_mutation"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditEvent is permanent and append-only' USING ERRCODE='55000';
END;
$$;
CREATE TRIGGER "AuditEvent_no_update_delete" BEFORE UPDATE OR DELETE ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION "reject_audit_event_mutation"();
CREATE TRIGGER "AuditEvent_no_truncate" BEFORE TRUNCATE ON "AuditEvent"
FOR EACH STATEMENT EXECUTE FUNCTION "reject_audit_event_mutation"();

COMMIT;
