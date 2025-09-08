/*
  Warnings:

  - A unique constraint covering the columns `[provider,providerAccountId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[missionId]` on the table `FieldReport` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[missionId]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sessionToken]` on the table `Session` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `TaskTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[token]` on the table `VerificationToken` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[identifier,token]` on the table `VerificationToken` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_ConversationParticipants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[A,B]` on the table `_MissionToTeamMember` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[missionId]` on the table `conversations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[missionNumber]` on the table `missions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoiceId]` on the table `missions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[quoteNumber]` on the table `quotes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[leadId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `team_members` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('BACKUP', 'ERROR', 'INFO', 'SECURITY');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('SUCCESS', 'FAILED', 'IN_PROGRESS');

-- DropIndex
DROP INDEX "idx_invoices_status_due";

-- DropIndex
DROP INDEX "idx_tasks_mission_status";

-- DropIndex
DROP INDEX "idx_activities_user_created";

-- DropIndex
DROP INDEX "idx_expenses_user_date";

-- DropIndex
DROP INDEX "idx_inventory_category_stock";

-- DropIndex
DROP INDEX "idx_leads_assigned_to";

-- DropIndex
DROP INDEX "idx_leads_status_created";

-- DropIndex
DROP INDEX "idx_messages_conversation_created";

-- DropIndex
DROP INDEX "idx_missions_status_scheduled";

-- DropIndex
DROP INDEX "idx_missions_team_leader";

-- DropIndex
DROP INDEX "idx_quotes_lead_status";

-- DropIndex
DROP INDEX "idx_subscriptions_next_billing";

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "adminNotes" TEXT,
ADD COLUMN     "adminValidated" BOOLEAN,
ADD COLUMN     "adminValidatedAt" TIMESTAMP(3),
ADD COLUMN     "adminValidatedBy" TEXT,
ADD COLUMN     "correctionRequired" BOOLEAN,
ADD COLUMN     "issuesFound" TEXT,
ADD COLUMN     "qualityScore" INTEGER;

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "type" "LogType" NOT NULL,
    "status" "LogStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldReport_missionId_key" ON "FieldReport"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_missionId_key" ON "Invoice"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_name_key" ON "TaskTemplate"("name");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "_ConversationParticipants_AB_unique" ON "_ConversationParticipants"("A", "B");

-- CreateIndex
CREATE INDEX "_ConversationParticipants_B_index" ON "_ConversationParticipants"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MissionToTeamMember_AB_unique" ON "_MissionToTeamMember"("A", "B");

-- CreateIndex
CREATE INDEX "_MissionToTeamMember_B_index" ON "_MissionToTeamMember"("B");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_missionId_key" ON "conversations"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "missions_missionNumber_key" ON "missions"("missionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "missions_invoiceId_key" ON "missions"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_leadId_key" ON "subscriptions"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_userId_key" ON "team_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
