-- DropForeignKey
ALTER TABLE "public"."conversations" DROP CONSTRAINT "conversations_missionId_fkey";

-- AlterTable
ALTER TABLE "public"."conversations" ALTER COLUMN "missionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."conversations" ADD CONSTRAINT "conversations_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "public"."missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
