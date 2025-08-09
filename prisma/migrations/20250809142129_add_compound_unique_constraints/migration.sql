/*
  Warnings:

  - A unique constraint covering the columns `[id,userId]` on the table `BankAccount` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `Budget` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `Goal` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `Holding` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `PlannedEvent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,userId]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_id_userId_key" ON "BankAccount"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_id_userId_key" ON "Budget"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_id_userId_key" ON "Goal"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Holding_id_userId_key" ON "Holding"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedEvent_id_userId_key" ON "PlannedEvent"("id", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_id_userId_key" ON "Transaction"("id", "userId");
