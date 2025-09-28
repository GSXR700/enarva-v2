/*
  Warnings:

  - You are about to drop the `FieldReport` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,teamId]` on the table `team_members` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `quality_checks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActivityType" ADD VALUE 'MISSION_STATUS_UPDATED';
ALTER TYPE "public"."ActivityType" ADD VALUE 'TEAM_CREATED';
ALTER TYPE "public"."ActivityType" ADD VALUE 'TEAM_UPDATED';
ALTER TYPE "public"."ActivityType" ADD VALUE 'TEAM_DELETED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."TaskType" ADD VALUE 'EXECUTION';
ALTER TYPE "public"."TaskType" ADD VALUE 'QUALITY_CHECK';
ALTER TYPE "public"."TaskType" ADD VALUE 'DOCUMENTATION';
ALTER TYPE "public"."TaskType" ADD VALUE 'CLIENT_INTERACTION';

-- DropForeignKey
ALTER TABLE "public"."FieldReport" DROP CONSTRAINT "FieldReport_missionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FieldReport" DROP CONSTRAINT "FieldReport_submittedById_fkey";

-- DropIndex
DROP INDEX "public"."team_members_userId_key";

-- AlterTable
ALTER TABLE "public"."quality_checks" ADD COLUMN     "clientNotified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "corrections" JSONB,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "followUpDate" TIMESTAMP(3),
ADD COLUMN     "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "public"."quotes" ALTER COLUMN "expiresAt" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."FieldReport";

-- CreateTable
CREATE TABLE "public"."field_reports" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generalObservations" TEXT,
    "clientFeedback" TEXT,
    "issuesEncountered" TEXT,
    "materialsUsed" JSONB,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    "beforePhotos" TEXT[],
    "afterPhotos" TEXT[],
    "clientSignatureUrl" TEXT,
    "teamLeadSignatureUrl" TEXT,
    "additionalNotes" TEXT,

    CONSTRAINT "field_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_reports_missionId_key" ON "public"."field_reports"("missionId");

-- CreateIndex
CREATE INDEX "quality_checks_missionId_status_idx" ON "public"."quality_checks"("missionId", "status");

-- CreateIndex
CREATE INDEX "quality_checks_type_status_idx" ON "public"."quality_checks"("type", "status");

-- CreateIndex
CREATE INDEX "quality_checks_checkedAt_idx" ON "public"."quality_checks"("checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_userId_teamId_key" ON "public"."team_members"("userId", "teamId");

-- AddForeignKey
ALTER TABLE "public"."field_reports" ADD CONSTRAINT "field_reports_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."field_reports" ADD CONSTRAINT "field_reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quality_checks" ADD CONSTRAINT "quality_checks_checkedBy_fkey" FOREIGN KEY ("checkedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
