-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('Active', 'OnHold', 'Archived');

-- CreateEnum
CREATE TYPE "design_approval_status" AS ENUM ('Draft', 'InReview', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "document_status" AS ENUM ('Draft', 'Active', 'Superseded', 'Archived');

-- CreateEnum
CREATE TYPE "dependency_status" AS ENUM ('Pending', 'Satisfied', 'Waived', 'NotApplicable');

-- CreateEnum
CREATE TYPE "boq_version_status" AS ENUM ('Draft', 'InReview', 'Approved', 'Locked', 'Superseded');

-- CreateEnum
CREATE TYPE "lock_status" AS ENUM ('Unlocked', 'Locked');

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- CreateEnum
CREATE TYPE "validation_severity" AS ENUM ('BLOCK', 'WARNING', 'INFO');

-- CreateEnum
CREATE TYPE "validation_result_status" AS ENUM ('Pass', 'Fail', 'Warning', 'Overridden');

-- CreateEnum
CREATE TYPE "approval_workflow_status" AS ENUM ('NotStarted', 'InProgress', 'Completed', 'Rejected');

-- CreateEnum
CREATE TYPE "handoff_status" AS ENUM ('Pending', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "edit_lock_object_type" AS ENUM ('boq_version');

-- CreateTable
CREATE TABLE "projects" (
    "project_id" UUID NOT NULL,
    "client_id" VARCHAR(64),
    "opportunity_id" VARCHAR(64),
    "project_name" VARCHAR(255) NOT NULL,
    "location" VARCHAR(255),
    "project_type" VARCHAR(64),
    "it_load_kw" DECIMAL(12,4) NOT NULL,
    "rack_count" INTEGER NOT NULL,
    "rack_density_kw_per_rack" DECIMAL(12,4),
    "tier_target" VARCHAR(32),
    "sla_target" VARCHAR(64),
    "currency" VARCHAR(8) NOT NULL DEFAULT 'THB',
    "vat_option" VARCHAR(32),
    "project_status" "project_status" NOT NULL DEFAULT 'Active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "design_basis_versions" (
    "design_basis_version_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "design_version_no" INTEGER NOT NULL,
    "it_load_assumption_kw" DECIMAL(12,4) NOT NULL,
    "rack_count_assumption" INTEGER NOT NULL,
    "rack_density_assumption" DECIMAL(12,4),
    "power_architecture" TEXT,
    "cooling_architecture" TEXT,
    "fire_protection_assumption" TEXT,
    "monitoring_assumption" TEXT,
    "redundancy_assumption" TEXT,
    "technical_compliance_basis" TEXT,
    "customer_requirement_reference" VARCHAR(255),
    "approval_status" "design_approval_status" NOT NULL DEFAULT 'Draft',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "design_basis_versions_pkey" PRIMARY KEY ("design_basis_version_id")
);

-- CreateTable
CREATE TABLE "documents" (
    "document_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "document_type" VARCHAR(64) NOT NULL,
    "document_name" VARCHAR(255) NOT NULL,
    "file_link" TEXT,
    "version_no" VARCHAR(32) NOT NULL,
    "document_status" "document_status" NOT NULL DEFAULT 'Draft',
    "related_workflow_stage" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "boq_versions" (
    "boq_version_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "status" "boq_version_status" NOT NULL DEFAULT 'Draft',
    "lock_status" "lock_status" NOT NULL DEFAULT 'Unlocked',
    "previous_boq_version_id" UUID,
    "change_reason" TEXT,
    "delta_cost" DECIMAL(18,4),
    "delta_selling_price" DECIMAL(18,4),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "boq_versions_pkey" PRIMARY KEY ("boq_version_id")
);

-- CreateTable
CREATE TABLE "boq_version_documents" (
    "boq_version_document_id" UUID NOT NULL,
    "boq_version_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "dependency_type" VARCHAR(64) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "dependency_status" "dependency_status" NOT NULL DEFAULT 'Pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "boq_version_documents_pkey" PRIMARY KEY ("boq_version_document_id")
);

-- CreateTable
CREATE TABLE "discipline_master" (
    "discipline_id" UUID NOT NULL,
    "discipline_code" VARCHAR(32) NOT NULL,
    "discipline_name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "discipline_master_pkey" PRIMARY KEY ("discipline_id")
);

-- CreateTable
CREATE TABLE "cost_category_master" (
    "cost_category_id" UUID NOT NULL,
    "category_code" VARCHAR(32) NOT NULL,
    "category_name" VARCHAR(128) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cost_category_master_pkey" PRIMARY KEY ("cost_category_id")
);

-- CreateTable
CREATE TABLE "project_disciplines" (
    "project_discipline_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "boq_version_id" UUID NOT NULL,
    "discipline_id" UUID NOT NULL,
    "included_flag" BOOLEAN NOT NULL DEFAULT true,
    "scope_description" TEXT,
    "exclusion_note" TEXT,
    "risk_level" "risk_level" NOT NULL DEFAULT 'Medium',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_disciplines_pkey" PRIMARY KEY ("project_discipline_id")
);

-- CreateTable
CREATE TABLE "boq_lines" (
    "boq_line_id" UUID NOT NULL,
    "boq_version_id" UUID NOT NULL,
    "project_discipline_id" UUID NOT NULL,
    "item_id" VARCHAR(64),
    "line_no" INTEGER NOT NULL,
    "item_description" TEXT NOT NULL,
    "unit" VARCHAR(32) NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "cost_source" VARCHAR(64),
    "confidence_level" VARCHAR(32),
    "is_critical_line" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "boq_lines_pkey" PRIMARY KEY ("boq_line_id")
);

-- CreateTable
CREATE TABLE "boq_cost_breakdowns" (
    "boq_cost_breakdown_id" UUID NOT NULL,
    "boq_line_id" UUID NOT NULL,
    "cost_category_id" UUID NOT NULL,
    "calculation_method" VARCHAR(64) NOT NULL,
    "base_value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "rate" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "quantity_factor" DECIMAL(18,4) NOT NULL DEFAULT 1,
    "calculated_value" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cost_source" VARCHAR(64),
    "confidence_level" VARCHAR(32),
    "manual_override_flag" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "boq_cost_breakdowns_pkey" PRIMARY KEY ("boq_cost_breakdown_id")
);

-- CreateTable
CREATE TABLE "validation_rules" (
    "validation_rule_id" UUID NOT NULL,
    "rule_code" VARCHAR(64) NOT NULL,
    "rule_group" VARCHAR(64) NOT NULL,
    "severity" "validation_severity" NOT NULL,
    "target_object_type" VARCHAR(64) NOT NULL,
    "message" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("validation_rule_id")
);

-- CreateTable
CREATE TABLE "validation_results" (
    "validation_result_id" UUID NOT NULL,
    "boq_version_id" UUID NOT NULL,
    "validation_rule_id" UUID NOT NULL,
    "rule_code" VARCHAR(64) NOT NULL,
    "rule_group" VARCHAR(64) NOT NULL,
    "severity" "validation_severity" NOT NULL,
    "target_object_type" VARCHAR(64) NOT NULL,
    "target_object_id" UUID,
    "message" TEXT NOT NULL,
    "result_status" "validation_result_status" NOT NULL,
    "override_reason" TEXT,
    "resolved_flag" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" VARCHAR(128),
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "validation_results_pkey" PRIMARY KEY ("validation_result_id")
);

-- CreateTable
CREATE TABLE "approval_workflows" (
    "approval_workflow_id" UUID NOT NULL,
    "boq_version_id" UUID NOT NULL,
    "current_stage" VARCHAR(64) NOT NULL DEFAULT 'Engineer Review',
    "workflow_status" "approval_workflow_status" NOT NULL DEFAULT 'NotStarted',
    "engineer_reviewed_by" VARCHAR(128),
    "engineer_reviewed_at" TIMESTAMPTZ(6),
    "manager_approved_by" VARCHAR(128),
    "manager_approved_at" TIMESTAMPTZ(6),
    "director_approved_by" VARCHAR(128),
    "director_approved_at" TIMESTAMPTZ(6),
    "final_locked_by" VARCHAR(128),
    "final_locked_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("approval_workflow_id")
);

-- CreateTable
CREATE TABLE "handoff_records" (
    "handoff_id" UUID NOT NULL,
    "boq_version_id" UUID NOT NULL,
    "handoff_status" "handoff_status" NOT NULL DEFAULT 'Pending',
    "handed_off_by" VARCHAR(128),
    "handoff_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "handoff_records_pkey" PRIMARY KEY ("handoff_id")
);

-- CreateTable
CREATE TABLE "edit_locks" (
    "edit_lock_id" UUID NOT NULL,
    "object_type" "edit_lock_object_type" NOT NULL,
    "object_id" UUID NOT NULL,
    "locked_by" VARCHAR(128) NOT NULL,
    "locked_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edit_locks_pkey" PRIMARY KEY ("edit_lock_id")
);

-- CreateTable
CREATE TABLE "vendor_quotes" (
    "vendor_quote_id" UUID NOT NULL,
    "boq_line_id" UUID NOT NULL,
    "vendor_name" VARCHAR(255) NOT NULL,
    "price" DECIMAL(18,4) NOT NULL,
    "currency" VARCHAR(8) NOT NULL,
    "valid_until" DATE,
    "reference_document_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vendor_quotes_pkey" PRIMARY KEY ("vendor_quote_id")
);

-- CreateTable
CREATE TABLE "training_records" (
    "training_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "session_date" DATE NOT NULL,
    "trainer" VARCHAR(255) NOT NULL,
    "attendees" TEXT,
    "deliverables" TEXT,
    "linked_document_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("training_id")
);

-- CreateIndex
CREATE INDEX "projects_project_status_idx" ON "projects"("project_status");

-- CreateIndex
CREATE INDEX "projects_client_id_idx" ON "projects"("client_id");

-- CreateIndex
CREATE INDEX "design_basis_versions_project_id_idx" ON "design_basis_versions"("project_id");

-- CreateIndex
CREATE INDEX "design_basis_versions_approval_status_idx" ON "design_basis_versions"("approval_status");

-- CreateIndex
CREATE UNIQUE INDEX "design_basis_versions_project_id_design_version_no_key" ON "design_basis_versions"("project_id", "design_version_no");

-- CreateIndex
CREATE INDEX "documents_project_id_idx" ON "documents"("project_id");

-- CreateIndex
CREATE INDEX "documents_document_type_idx" ON "documents"("document_type");

-- CreateIndex
CREATE INDEX "documents_related_workflow_stage_idx" ON "documents"("related_workflow_stage");

-- CreateIndex
CREATE INDEX "boq_versions_project_id_idx" ON "boq_versions"("project_id");

-- CreateIndex
CREATE INDEX "boq_versions_status_idx" ON "boq_versions"("status");

-- CreateIndex
CREATE INDEX "boq_versions_lock_status_idx" ON "boq_versions"("lock_status");

-- CreateIndex
CREATE INDEX "boq_versions_previous_boq_version_id_idx" ON "boq_versions"("previous_boq_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "boq_versions_project_id_version_no_key" ON "boq_versions"("project_id", "version_no");

-- CreateIndex
CREATE INDEX "boq_version_documents_boq_version_id_idx" ON "boq_version_documents"("boq_version_id");

-- CreateIndex
CREATE INDEX "boq_version_documents_dependency_status_idx" ON "boq_version_documents"("dependency_status");

-- CreateIndex
CREATE UNIQUE INDEX "boq_version_documents_boq_version_id_document_id_key" ON "boq_version_documents"("boq_version_id", "document_id");

-- CreateIndex
CREATE UNIQUE INDEX "discipline_master_discipline_code_key" ON "discipline_master"("discipline_code");

-- CreateIndex
CREATE UNIQUE INDEX "cost_category_master_category_code_key" ON "cost_category_master"("category_code");

-- CreateIndex
CREATE INDEX "project_disciplines_project_id_idx" ON "project_disciplines"("project_id");

-- CreateIndex
CREATE INDEX "project_disciplines_boq_version_id_idx" ON "project_disciplines"("boq_version_id");

-- CreateIndex
CREATE INDEX "project_disciplines_included_flag_idx" ON "project_disciplines"("included_flag");

-- CreateIndex
CREATE UNIQUE INDEX "project_disciplines_boq_version_id_discipline_id_key" ON "project_disciplines"("boq_version_id", "discipline_id");

-- CreateIndex
CREATE INDEX "boq_lines_boq_version_id_idx" ON "boq_lines"("boq_version_id");

-- CreateIndex
CREATE INDEX "boq_lines_project_discipline_id_idx" ON "boq_lines"("project_discipline_id");

-- CreateIndex
CREATE INDEX "boq_lines_is_critical_line_idx" ON "boq_lines"("is_critical_line");

-- CreateIndex
CREATE UNIQUE INDEX "boq_lines_boq_version_id_line_no_key" ON "boq_lines"("boq_version_id", "line_no");

-- CreateIndex
CREATE INDEX "boq_cost_breakdowns_boq_line_id_idx" ON "boq_cost_breakdowns"("boq_line_id");

-- CreateIndex
CREATE INDEX "boq_cost_breakdowns_cost_category_id_idx" ON "boq_cost_breakdowns"("cost_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "validation_rules_rule_code_key" ON "validation_rules"("rule_code");

-- CreateIndex
CREATE INDEX "validation_rules_rule_group_idx" ON "validation_rules"("rule_group");

-- CreateIndex
CREATE INDEX "validation_rules_severity_idx" ON "validation_rules"("severity");

-- CreateIndex
CREATE INDEX "validation_results_boq_version_id_idx" ON "validation_results"("boq_version_id");

-- CreateIndex
CREATE INDEX "validation_results_validation_rule_id_idx" ON "validation_results"("validation_rule_id");

-- CreateIndex
CREATE INDEX "validation_results_severity_idx" ON "validation_results"("severity");

-- CreateIndex
CREATE INDEX "validation_results_result_status_idx" ON "validation_results"("result_status");

-- CreateIndex
CREATE INDEX "validation_results_resolved_flag_idx" ON "validation_results"("resolved_flag");

-- CreateIndex
CREATE UNIQUE INDEX "approval_workflows_boq_version_id_key" ON "approval_workflows"("boq_version_id");

-- CreateIndex
CREATE INDEX "approval_workflows_workflow_status_idx" ON "approval_workflows"("workflow_status");

-- CreateIndex
CREATE INDEX "approval_workflows_current_stage_idx" ON "approval_workflows"("current_stage");

-- CreateIndex
CREATE INDEX "handoff_records_boq_version_id_idx" ON "handoff_records"("boq_version_id");

-- CreateIndex
CREATE INDEX "handoff_records_handoff_status_idx" ON "handoff_records"("handoff_status");

-- CreateIndex
CREATE INDEX "edit_locks_object_id_idx" ON "edit_locks"("object_id");

-- CreateIndex
CREATE UNIQUE INDEX "edit_locks_object_type_object_id_key" ON "edit_locks"("object_type", "object_id");

-- CreateIndex
CREATE INDEX "vendor_quotes_boq_line_id_idx" ON "vendor_quotes"("boq_line_id");

-- CreateIndex
CREATE INDEX "vendor_quotes_valid_until_idx" ON "vendor_quotes"("valid_until");

-- CreateIndex
CREATE INDEX "training_records_project_id_idx" ON "training_records"("project_id");

-- CreateIndex
CREATE INDEX "training_records_session_date_idx" ON "training_records"("session_date");

-- AddForeignKey
ALTER TABLE "design_basis_versions" ADD CONSTRAINT "design_basis_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_versions" ADD CONSTRAINT "boq_versions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_versions" ADD CONSTRAINT "boq_versions_previous_boq_version_id_fkey" FOREIGN KEY ("previous_boq_version_id") REFERENCES "boq_versions"("boq_version_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_version_documents" ADD CONSTRAINT "boq_version_documents_boq_version_id_fkey" FOREIGN KEY ("boq_version_id") REFERENCES "boq_versions"("boq_version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_version_documents" ADD CONSTRAINT "boq_version_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_disciplines" ADD CONSTRAINT "project_disciplines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_disciplines" ADD CONSTRAINT "project_disciplines_boq_version_id_fkey" FOREIGN KEY ("boq_version_id") REFERENCES "boq_versions"("boq_version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_disciplines" ADD CONSTRAINT "project_disciplines_discipline_id_fkey" FOREIGN KEY ("discipline_id") REFERENCES "discipline_master"("discipline_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_lines" ADD CONSTRAINT "boq_lines_boq_version_id_fkey" FOREIGN KEY ("boq_version_id") REFERENCES "boq_versions"("boq_version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_lines" ADD CONSTRAINT "boq_lines_project_discipline_id_fkey" FOREIGN KEY ("project_discipline_id") REFERENCES "project_disciplines"("project_discipline_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_cost_breakdowns" ADD CONSTRAINT "boq_cost_breakdowns_boq_line_id_fkey" FOREIGN KEY ("boq_line_id") REFERENCES "boq_lines"("boq_line_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boq_cost_breakdowns" ADD CONSTRAINT "boq_cost_breakdowns_cost_category_id_fkey" FOREIGN KEY ("cost_category_id") REFERENCES "cost_category_master"("cost_category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_boq_version_id_fkey" FOREIGN KEY ("boq_version_id") REFERENCES "boq_versions"("boq_version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_validation_rule_id_fkey" FOREIGN KEY ("validation_rule_id") REFERENCES "validation_rules"("validation_rule_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_workflows" ADD CONSTRAINT "approval_workflows_boq_version_id_fkey" FOREIGN KEY ("boq_version_id") REFERENCES "boq_versions"("boq_version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoff_records" ADD CONSTRAINT "handoff_records_boq_version_id_fkey" FOREIGN KEY ("boq_version_id") REFERENCES "boq_versions"("boq_version_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_quotes" ADD CONSTRAINT "vendor_quotes_boq_line_id_fkey" FOREIGN KEY ("boq_line_id") REFERENCES "boq_lines"("boq_line_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_quotes" ADD CONSTRAINT "vendor_quotes_reference_document_id_fkey" FOREIGN KEY ("reference_document_id") REFERENCES "documents"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_records" ADD CONSTRAINT "training_records_linked_document_id_fkey" FOREIGN KEY ("linked_document_id") REFERENCES "documents"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;
