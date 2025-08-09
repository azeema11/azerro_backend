/*
  Warnings:

  - A unique constraint covering the columns `[completedTxId]` on the table `PlannedEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "BankAccount_userId_idx" ON "BankAccount"("userId");

-- CreateIndex
CREATE INDEX "BankAccount_userId_type_idx" ON "BankAccount"("userId", "type");

-- CreateIndex
CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex
CREATE INDEX "Budget_userId_category_idx" ON "Budget"("userId", "category");

-- CreateIndex
CREATE INDEX "Budget_userId_period_idx" ON "Budget"("userId", "period");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_userId_completed_idx" ON "Goal"("userId", "completed");

-- CreateIndex
CREATE INDEX "Goal_userId_targetDate_idx" ON "Goal"("userId", "targetDate");

-- CreateIndex
CREATE INDEX "Goal_targetDate_idx" ON "Goal"("targetDate");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_userId_assetType_idx" ON "Holding"("userId", "assetType");

-- CreateIndex
CREATE INDEX "Holding_ticker_idx" ON "Holding"("ticker");

-- CreateIndex
CREATE INDEX "Holding_platform_idx" ON "Holding"("platform");

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
CREATE INDEX "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_category_idx" ON "Transaction"("userId", "category");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- AddForeignKey
ALTER TABLE "PlannedEvent" ADD CONSTRAINT "PlannedEvent_completedTxId_fkey" FOREIGN KEY ("completedTxId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
