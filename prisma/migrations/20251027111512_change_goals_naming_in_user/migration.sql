/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Assistant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `Goal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `Holding` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[completedTxId]` on the table `PlannedEvent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `PlannedEvent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,assistantId]` on the table `UserAssistant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Assistant_name_key" ON "Assistant"("name");

-- CreateIndex
CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex
CREATE INDEX "Budget_userId_category_idx" ON "Budget"("userId", "category");

-- CreateIndex
CREATE INDEX "Budget_userId_period_idx" ON "Budget"("userId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_id_userId_key" ON "Budget"("id", "userId");

-- CreateIndex
CREATE INDEX "CurrencyRateHistory_base_target_idx" ON "CurrencyRateHistory"("base", "target");

-- CreateIndex
CREATE INDEX "CurrencyRateHistory_rateDate_idx" ON "CurrencyRateHistory"("rateDate");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_userId_completed_idx" ON "Goal"("userId", "completed");

-- CreateIndex
CREATE INDEX "Goal_userId_targetDate_idx" ON "Goal"("userId", "targetDate");

-- CreateIndex
CREATE INDEX "Goal_targetDate_idx" ON "Goal"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_id_userId_key" ON "Goal"("id", "userId");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_userId_assetType_idx" ON "Holding"("userId", "assetType");

-- CreateIndex
CREATE INDEX "Holding_ticker_idx" ON "Holding"("ticker");

-- CreateIndex
CREATE INDEX "Holding_platform_idx" ON "Holding"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_id_userId_key" ON "Holding"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedEvent_completedTxId_key" ON "PlannedEvent"("completedTxId");

-- CreateIndex
CREATE INDEX "PlannedEvent_userId_completed_idx" ON "PlannedEvent"("userId", "completed");

-- CreateIndex
CREATE INDEX "PlannedEvent_userId_targetDate_idx" ON "PlannedEvent"("userId", "targetDate");

-- CreateIndex
CREATE INDEX "PlannedEvent_userId_category_idx" ON "PlannedEvent"("userId", "category");

-- CreateIndex
CREATE INDEX "PlannedEvent_targetDate_idx" ON "PlannedEvent"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedEvent_id_userId_key" ON "PlannedEvent"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAssistant_userId_assistantId_key" ON "UserAssistant"("userId", "assistantId");
