/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `_MissionToTeamMember` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,teamId]` on the table `team_members` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `teamId` to the `team_members` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."TaskCategory" ADD VALUE 'GENERAL';

-- DropForeignKey
ALTER TABLE "public"."_MissionToTeamMember" DROP CONSTRAINT "_MissionToTeamMember_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_MissionToTeamMember" DROP CONSTRAINT "_MissionToTeamMember_B_fkey";

-- AlterTable
ALTER TABLE "public"."_ConversationParticipants" ADD CONSTRAINT "_ConversationParticipants_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_ConversationParticipants_AB_unique";

-- AlterTable
ALTER TABLE "public"."missions" ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "public"."team_members" ADD COLUMN     "teamId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "password",
ADD COLUMN     "hashedPassword" TEXT;

-- DropTable
DROP TABLE "public"."_MissionToTeamMember";

-- DropEnum
DROP TYPE "public"."MaterialType";

-- CreateTable
CREATE TABLE "public"."teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_MessageReadBy" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MessageReadBy_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "public"."teams"("name");

-- CreateIndex
CREATE INDEX "_MessageReadBy_B_index" ON "public"."_MessageReadBy"("B");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_userId_teamId_key" ON "public"."team_members"("userId", "teamId");

-- AddForeignKey
ALTER TABLE "public"."team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."missions" ADD CONSTRAINT "missions_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MessageReadBy" ADD CONSTRAINT "_MessageReadBy_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_MessageReadBy" ADD CONSTRAINT "_MessageReadBy_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
