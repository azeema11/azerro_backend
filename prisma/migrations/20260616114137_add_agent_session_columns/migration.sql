-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "actions" JSONB,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "sessionId" VARCHAR(100),
ADD COLUMN     "toolCalls" JSONB;

-- CreateIndex
CREATE INDEX "ChatMessage_userId_sessionId_idx" ON "ChatMessage"("userId", "sessionId");
