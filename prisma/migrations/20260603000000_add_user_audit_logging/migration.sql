-- Add user-scoped audit metadata for project generation and export events.
ALTER TABLE "DataSourceLog" ADD COLUMN "userId" TEXT;
ALTER TABLE "DataSourceLog" ADD COLUMN "action" TEXT NOT NULL DEFAULT 'provider_run';

CREATE INDEX "DataSourceLog_userId_idx" ON "DataSourceLog"("userId");
CREATE INDEX "DataSourceLog_projectId_action_idx" ON "DataSourceLog"("projectId", "action");

ALTER TABLE "DataSourceLog" ADD CONSTRAINT "DataSourceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
