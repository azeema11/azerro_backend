-- AlterTable
ALTER TABLE "PlannedEvent" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completedTxId" TEXT;
