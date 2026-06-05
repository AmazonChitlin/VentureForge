ALTER TABLE "EngineOutput" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "EngineOutput" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "EngineOutput" ADD COLUMN "sanitizedErrorMessage" TEXT;
