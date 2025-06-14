/*
  Warnings:

  - Added the required column `holdingCurrency` to the `Holding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platform` to the `Holding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Holding" ADD COLUMN     "baseCurrency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "convertedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "holdingCurrency" TEXT NOT NULL,
ADD COLUMN     "platform" TEXT NOT NULL;
