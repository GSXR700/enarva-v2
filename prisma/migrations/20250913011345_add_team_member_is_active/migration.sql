/*
  Warnings:

  - You are about to alter the column `hourlyRate` on the `team_members` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(8,2)`.
  - Added the required column `updatedAt` to the `team_members` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ActivityType" ADD VALUE 'TEAM_MEMBER_CREATED';
ALTER TYPE "public"."ActivityType" ADD VALUE 'TEAM_MEMBER_UPDATED';
ALTER TYPE "public"."ActivityType" ADD VALUE 'TEAM_MEMBER_DELETED';

-- DropForeignKey
ALTER TABLE "public"."team_members" DROP CONSTRAINT "team_members_teamId_fkey";

-- DropForeignKey
ALTER TABLE "public"."team_members" DROP CONSTRAINT "team_members_userId_fkey";

-- DropIndex
DROP INDEX "public"."team_members_userId_teamId_key";

-- AlterTable
ALTER TABLE "public"."team_members" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "experience" SET DEFAULT 'JUNIOR',
ALTER COLUMN "hourlyRate" SET DATA TYPE DECIMAL(8,2);

-- AddForeignKey
ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
