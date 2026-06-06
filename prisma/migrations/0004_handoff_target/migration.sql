-- TD-7A-010: handoff target schema (S7B-0 Baseline Reconciliation Candidate)

-- CreateEnum
CREATE TYPE "handoff_target" AS ENUM ('Procurement', 'Construction', 'ClientHandover');

-- AlterTable
ALTER TABLE "handoff_records" ADD COLUMN "handoff_target" "handoff_target";
