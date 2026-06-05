-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "workspaceKey" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "summary" TEXT,
    "workspaceState" JSONB NOT NULL DEFAULT '{}',
    "guidedBuilderState" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderProfile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "founderName" TEXT NOT NULL,
    "founderExperience" TEXT NOT NULL,
    "skills" JSONB NOT NULL,
    "industryExperience" TEXT NOT NULL,
    "startupCapital" DECIMAL(65,30) NOT NULL,
    "desiredFunding" DECIMAL(65,30) NOT NULL,
    "creditReadiness" TEXT NOT NULL,
    "riskTolerance" TEXT NOT NULL,
    "weeklyAvailableHours" INTEGER NOT NULL,
    "launchTimeline" TEXT NOT NULL,
    "ownershipAttributes" JSONB NOT NULL,

    CONSTRAINT "FounderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessIdea" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessIdea" TEXT NOT NULL,
    "productOrService" TEXT NOT NULL,
    "customerProblem" TEXT NOT NULL,
    "proposedSolution" TEXT NOT NULL,
    "targetCustomer" TEXT NOT NULL,
    "businessModels" JSONB NOT NULL,
    "industry" TEXT NOT NULL,
    "naicsGuess" TEXT NOT NULL,
    "knownCompetitors" JSONB NOT NULL,
    "pricingIdea" TEXT NOT NULL,
    "expectedStartupCosts" DECIMAL(65,30) NOT NULL,
    "staffingPlan" TEXT NOT NULL,
    "requiredEquipment" JSONB NOT NULL,
    "licensingConcerns" JSONB NOT NULL,
    "fundingNeed" TEXT NOT NULL,
    "websiteNeeds" TEXT NOT NULL,

    CONSTRAINT "BusinessIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessConcept" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL,
    "assumptions" JSONB NOT NULL,
    "missingInfo" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,

    CONSTRAINT "BusinessConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntakeAnswer" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntakeAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngineOutput" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineOutput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeasibilityReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeasibilityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketResearchReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketResearchReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "url" TEXT,
    "sourceType" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPersona" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategicAnalysis" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "StrategicAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SWOTAnalysis" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "SWOTAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PESTLEAnalysis" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "PESTLEAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyExecutionPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "StrategyExecutionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "Initiative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPlan" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessPlanSection" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "content" JSONB NOT NULL,

    CONSTRAINT "BusinessPlanSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialProjection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialAssumption" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "FinancialAssumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingOpportunity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "FundingOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingMatch" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "matchScore" INTEGER NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "FundingMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateProgram" (
    "id" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eligibilityTags" JSONB NOT NULL,
    "industries" JSONB NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "sourceType" TEXT NOT NULL,

    CONSTRAINT "StateProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaunchTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "LaunchTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "RiskItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteProject" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "WebsiteProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsitePage" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "state" TEXT,
    "industry" TEXT,
    "tags" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "reliabilityLevel" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginConfig" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PluginConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSourceLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestMeta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSourceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_workspaceKey_key" ON "User"("workspaceKey");

-- CreateIndex
CREATE INDEX "BusinessProject_userId_idx" ON "BusinessProject"("userId");

-- CreateIndex
CREATE INDEX "BusinessProject_stateCode_idx" ON "BusinessProject"("stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "FounderProfile_projectId_key" ON "FounderProfile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessIdea_projectId_key" ON "BusinessIdea"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessConcept_projectId_key" ON "BusinessConcept"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "IntakeAnswer_projectId_field_key" ON "IntakeAnswer"("projectId", "field");

-- CreateIndex
CREATE INDEX "EngineOutput_projectId_idx" ON "EngineOutput"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EngineOutput_projectId_moduleKey_key" ON "EngineOutput"("projectId", "moduleKey");

-- CreateIndex
CREATE UNIQUE INDEX "FeasibilityReport_projectId_key" ON "FeasibilityReport"("projectId");

-- CreateIndex
CREATE INDEX "MarketResearchReport_projectId_idx" ON "MarketResearchReport"("projectId");

-- CreateIndex
CREATE INDEX "ResearchSource_reportId_idx" ON "ResearchSource"("reportId");

-- CreateIndex
CREATE INDEX "CustomerPersona_projectId_idx" ON "CustomerPersona"("projectId");

-- CreateIndex
CREATE INDEX "Competitor_projectId_idx" ON "Competitor"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StrategicAnalysis_projectId_key" ON "StrategicAnalysis"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SWOTAnalysis_strategyId_key" ON "SWOTAnalysis"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "PESTLEAnalysis_strategyId_key" ON "PESTLEAnalysis"("strategyId");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyExecutionPlan_projectId_key" ON "StrategyExecutionPlan"("projectId");

-- CreateIndex
CREATE INDEX "Initiative_planId_idx" ON "Initiative"("planId");

-- CreateIndex
CREATE INDEX "BusinessPlan_projectId_idx" ON "BusinessPlan"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPlanSection_planId_sectionKey_key" ON "BusinessPlanSection"("planId", "sectionKey");

-- CreateIndex
CREATE INDEX "FinancialProjection_projectId_idx" ON "FinancialProjection"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAssumption_projectId_key_key" ON "FinancialAssumption"("projectId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "FundingMatch_projectId_opportunityId_key" ON "FundingMatch"("projectId", "opportunityId");

-- CreateIndex
CREATE INDEX "StateProgram_stateCode_idx" ON "StateProgram"("stateCode");

-- CreateIndex
CREATE UNIQUE INDEX "StateProgram_stateCode_title_key" ON "StateProgram"("stateCode", "title");

-- CreateIndex
CREATE INDEX "LaunchTask_projectId_idx" ON "LaunchTask"("projectId");

-- CreateIndex
CREATE INDEX "RiskItem_projectId_idx" ON "RiskItem"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteProject_projectId_key" ON "WebsiteProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePage_websiteId_slug_key" ON "WebsitePage"("websiteId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_url_key" ON "Resource"("url");

-- CreateIndex
CREATE UNIQUE INDEX "PluginConfig_pluginId_key" ON "PluginConfig"("pluginId");

-- CreateIndex
CREATE INDEX "ExportRecord_projectId_idx" ON "ExportRecord"("projectId");

-- CreateIndex
CREATE INDEX "DataSourceLog_projectId_idx" ON "DataSourceLog"("projectId");

-- CreateIndex
CREATE INDEX "DataSourceLog_providerId_idx" ON "DataSourceLog"("providerId");

-- AddForeignKey
ALTER TABLE "BusinessProject" ADD CONSTRAINT "BusinessProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderProfile" ADD CONSTRAINT "FounderProfile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessIdea" ADD CONSTRAINT "BusinessIdea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessConcept" ADD CONSTRAINT "BusinessConcept_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntakeAnswer" ADD CONSTRAINT "IntakeAnswer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineOutput" ADD CONSTRAINT "EngineOutput_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeasibilityReport" ADD CONSTRAINT "FeasibilityReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketResearchReport" ADD CONSTRAINT "MarketResearchReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MarketResearchReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPersona" ADD CONSTRAINT "CustomerPersona_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategicAnalysis" ADD CONSTRAINT "StrategicAnalysis_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SWOTAnalysis" ADD CONSTRAINT "SWOTAnalysis_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "StrategicAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PESTLEAnalysis" ADD CONSTRAINT "PESTLEAnalysis_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "StrategicAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyExecutionPlan" ADD CONSTRAINT "StrategyExecutionPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Initiative" ADD CONSTRAINT "Initiative_planId_fkey" FOREIGN KEY ("planId") REFERENCES "StrategyExecutionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPlan" ADD CONSTRAINT "BusinessPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessPlanSection" ADD CONSTRAINT "BusinessPlanSection_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BusinessPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialProjection" ADD CONSTRAINT "FinancialProjection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAssumption" ADD CONSTRAINT "FinancialAssumption_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingMatch" ADD CONSTRAINT "FundingMatch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingMatch" ADD CONSTRAINT "FundingMatch_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "FundingOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchTask" ADD CONSTRAINT "LaunchTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskItem" ADD CONSTRAINT "RiskItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteProject" ADD CONSTRAINT "WebsiteProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsitePage" ADD CONSTRAINT "WebsitePage_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "WebsiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRecord" ADD CONSTRAINT "ExportRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSourceLog" ADD CONSTRAINT "DataSourceLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "BusinessProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
