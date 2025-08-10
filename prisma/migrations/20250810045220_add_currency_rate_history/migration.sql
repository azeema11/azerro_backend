-- CreateTable
CREATE TABLE "CurrencyRateHistory" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "rateDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyRateHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CurrencyRateHistory_base_target_idx" ON "CurrencyRateHistory"("base", "target");

-- CreateIndex
CREATE INDEX "CurrencyRateHistory_rateDate_idx" ON "CurrencyRateHistory"("rateDate");

-- CreateIndex
CREATE UNIQUE INDEX "CurrencyRateHistory_base_target_rateDate_key" ON "CurrencyRateHistory"("base", "target", "rateDate");
