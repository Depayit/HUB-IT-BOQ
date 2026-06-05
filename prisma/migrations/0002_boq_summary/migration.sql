-- CreateTable
CREATE TABLE "boq_summary" (
    "boq_summary_id" UUID NOT NULL,
    "boq_version_id" UUID NOT NULL,
    "total_material_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_labor_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_logistics_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_testing_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_documentation_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_indirect_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_risk_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "total_overhead_cost" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "subtotal_before_margin" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "margin_percent" DECIMAL(8,4) NOT NULL DEFAULT 15,
    "selling_price" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "gross_profit" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "gross_margin_percent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "boq_summary_pkey" PRIMARY KEY ("boq_summary_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boq_summary_boq_version_id_key" ON "boq_summary"("boq_version_id");

-- CreateIndex
CREATE INDEX "boq_summary_boq_version_id_idx" ON "boq_summary"("boq_version_id");

-- AddForeignKey
ALTER TABLE "boq_summary" ADD CONSTRAINT "boq_summary_boq_version_id_fkey" FOREIGN KEY ("boq_version_id") REFERENCES "boq_versions"("boq_version_id") ON DELETE CASCADE ON UPDATE CASCADE;
