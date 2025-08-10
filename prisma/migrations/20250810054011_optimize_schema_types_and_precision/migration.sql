/*
  Warnings:

  - You are about to alter the column `name` on the `Assistant` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `displayName` on the `Assistant` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `description` on the `Assistant` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `name` on the `BankAccount` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `balance` on the `BankAccount` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `currency` on the `BankAccount` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `amount` on the `Budget` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `base` on the `CurrencyRate` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `target` on the `CurrencyRate` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `rate` on the `CurrencyRate` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `base` on the `CurrencyRateHistory` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `target` on the `CurrencyRateHistory` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `rate` on the `CurrencyRateHistory` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(18,8)`.
  - You are about to alter the column `name` on the `Goal` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `description` on the `Goal` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(1000)`.
  - You are about to alter the column `targetAmount` on the `Goal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `savedAmount` on the `Goal` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `currency` on the `Goal` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `platform` on the `Holding` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `ticker` on the `Holding` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `name` on the `Holding` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `quantity` on the `Holding` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(20,8)`.
  - You are about to alter the column `avgCost` on the `Holding` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,4)`.
  - You are about to alter the column `holdingCurrency` on the `Holding` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `lastPrice` on the `Holding` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,4)`.
  - You are about to alter the column `convertedValue` on the `Holding` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `name` on the `PlannedEvent` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(200)`.
  - You are about to alter the column `estimatedCost` on the `PlannedEvent` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `savedSoFar` on the `PlannedEvent` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `currency` on the `PlannedEvent` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `currency` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `description` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(500)`.
  - You are about to alter the column `name` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `passwordHash` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `monthlyIncome` on the `User` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(15,2)`.
  - You are about to alter the column `baseCurrency` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.

*/
-- AlterTable
ALTER TABLE "Assistant" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "displayName" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "BankAccount" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "balance" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "Budget" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "CurrencyRate" ALTER COLUMN "base" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "target" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "rate" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "CurrencyRateHistory" ALTER COLUMN "base" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "target" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "rate" SET DATA TYPE DECIMAL(18,8);

-- AlterTable
ALTER TABLE "Goal" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(1000),
ALTER COLUMN "targetAmount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "savedAmount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "Holding" ALTER COLUMN "platform" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "ticker" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(20,8),
ALTER COLUMN "avgCost" SET DATA TYPE DECIMAL(15,4),
ALTER COLUMN "holdingCurrency" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "lastPrice" SET DATA TYPE DECIMAL(15,4),
ALTER COLUMN "convertedValue" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "PlannedEvent" ALTER COLUMN "name" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "estimatedCost" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "savedSoFar" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "passwordHash" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "monthlyIncome" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "baseCurrency" SET DATA TYPE VARCHAR(3);
