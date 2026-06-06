-- CreateEnum
CREATE TYPE "audit_action_type" AS ENUM ('create', 'update', 'delete', 'approve', 'reject', 'lock', 'override', 'handoff', 'correction');

-- CreateTable
CREATE TABLE "audit_logs" (
    "audit_log_id" UUID NOT NULL,
    "object_type" VARCHAR(64) NOT NULL,
    "object_id" UUID NOT NULL,
    "action_type" "audit_action_type" NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_by" VARCHAR(128) NOT NULL,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "change_reason" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("audit_log_id")
);

-- CreateIndex
CREATE INDEX "audit_logs_object_type_object_id_idx" ON "audit_logs"("object_type", "object_id");

-- CreateIndex
CREATE INDEX "audit_logs_changed_at_idx" ON "audit_logs"("changed_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_type_idx" ON "audit_logs"("action_type");
