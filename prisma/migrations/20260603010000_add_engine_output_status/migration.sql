ALTER TABLE "EngineOutput" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'completed';
ALTER TABLE "EngineOutput" ADD COLUMN "failedAt" TIMESTAMP(3);
ALTER TABLE "EngineOutput" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "EngineOutput" ADD COLUMN "retryAvailable" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "EngineOutput_projectId_status_idx" ON "EngineOutput"("projectId", "status");
