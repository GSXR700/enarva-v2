-- CreateIndex
CREATE INDEX "idx_leads_assignedToId" ON "leads"("assignedToId");

-- CreateIndex  
CREATE INDEX "idx_missions_leadId" ON "missions"("leadId");

-- CreateIndex
CREATE INDEX "idx_missions_teamLeaderId" ON "missions"("teamLeaderId");

-- CreateIndex
CREATE INDEX "idx_quotes_leadId" ON "quotes"("leadId");

-- CreateIndex
CREATE INDEX "idx_expenses_missionId" ON "expenses"("missionId");

-- CreateIndex
CREATE INDEX "idx_expenses_userId" ON "expenses"("userId");

-- CreateIndex
CREATE INDEX "idx_activities_userId" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "idx_field_reports_missionId" ON "field_reports"("missionId");