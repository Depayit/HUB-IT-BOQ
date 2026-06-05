-- CreateEnum
CREATE TYPE "handoff_target" AS ENUM ('Procurement', 'Construction', 'ClientHandover');

-- AlterTable
ALTER TABLE "handoff_records" ADD COLUMN "handoff_target" "handoff_target";
