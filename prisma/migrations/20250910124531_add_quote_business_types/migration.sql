/*
  Warnings:

  - You are about to drop the column `readByIds` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `messages` table. All the data in the column will be lost.
  - You are about to drop the column `corrections` on the `quality_checks` table. All the data in the column will be lost.
  - You are about to drop the column `score` on the `quality_checks` table. All the data in the column will be lost.
  - You are about to drop the column `validatedBy` on the `quality_checks` table. All the data in the column will be lost.
  - The `photos` column on the `quality_checks` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `averageRating` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `completedTasks` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `efficiency` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `experienceLevel` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `team_members` table. All the data in the column will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskTemplate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskTemplateItem` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `missionId` on table `conversations` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `experience` to the `team_members` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_missionId_fkey";

-- DropForeignKey
ALTER TABLE "TaskTemplateItem" DROP CONSTRAINT "TaskTemplateItem_templateId_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_missionId_fkey";

-- DropIndex
DROP INDEX "quotes_businessType_idx";

-- DropIndex
DROP INDEX "quotes_deliveryType_idx";

-- DropIndex
DROP INDEX "quotes_productCategory_idx";

-- DropIndex
DROP INDEX "quotes_status_businessType_idx";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "missionId" SET NOT NULL;

-- AlterTable
ALTER TABLE "messages" DROP COLUMN "readByIds",
DROP COLUMN "type",
ADD COLUMN     "attachments" TEXT[],
ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quality_checks" DROP COLUMN "corrections",
DROP COLUMN "score",
DROP COLUMN "validatedBy",
DROP COLUMN "photos",
ADD COLUMN     "photos" TEXT[],
ALTER COLUMN "checkedBy" DROP NOT NULL,
ALTER COLUMN "checkedAt" DROP NOT NULL,
ALTER COLUMN "checkedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "validatedAt" TIMESTAMP(3),
ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "team_members" DROP COLUMN "averageRating",
DROP COLUMN "completedTasks",
DROP COLUMN "createdAt",
DROP COLUMN "efficiency",
DROP COLUMN "email",
DROP COLUMN "experienceLevel",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "phone",
DROP COLUMN "updatedAt",
ADD COLUMN     "experience" "ExperienceLevel" NOT NULL,
ADD COLUMN     "hourlyRate" DECIMAL(65,30),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "TaskTemplate";

-- DropTable
DROP TABLE "TaskTemplateItem";

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "missionId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "estimatedTime" INTEGER,
    "actualTime" INTEGER,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tasks" JSONB NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
