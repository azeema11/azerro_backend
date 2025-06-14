/*
  Warnings:

  - You are about to drop the column `baseCurrency` on the `Holding` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Holding" DROP COLUMN "baseCurrency";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "baseCurrency" TEXT NOT NULL DEFAULT 'INR';
