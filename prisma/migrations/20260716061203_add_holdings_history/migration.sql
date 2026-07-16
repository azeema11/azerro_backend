-- CreateTable
CREATE TABLE "HoldingHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "ticker" VARCHAR(20) NOT NULL,
    "assetType" "AssetType" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "avgCost" DECIMAL(15,4) NOT NULL,
    "holdingCurrency" VARCHAR(3) NOT NULL,
    "lastPrice" DECIMAL(15,4) NOT NULL,
    "convertedValue" DECIMAL(15,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoldingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HoldingHistory_userId_idx" ON "HoldingHistory"("userId");

-- CreateIndex
CREATE INDEX "HoldingHistory_userId_recordedAt_idx" ON "HoldingHistory"("userId", "recordedAt");

-- CreateIndex
CREATE INDEX "HoldingHistory_holdingId_idx" ON "HoldingHistory"("holdingId");

-- CreateIndex
CREATE INDEX "HoldingHistory_ticker_idx" ON "HoldingHistory"("ticker");

-- CreateIndex
CREATE INDEX "HoldingHistory_assetType_idx" ON "HoldingHistory"("assetType");

-- AddForeignKey
ALTER TABLE "HoldingHistory" ADD CONSTRAINT "HoldingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
