-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "monthlyIncome" DOUBLE PRECISION;
