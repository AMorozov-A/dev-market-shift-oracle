-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RawRecordType" AS ENUM ('SEARCH_RESPONSE', 'VACANCY_DETAIL');

-- CreateEnum
CREATE TYPE "RoleCluster" AS ENUM ('FRONTEND', 'FULLSTACK', 'ML_AI', 'AI_FIRST', 'UNCLASSIFIED');

-- CreateEnum
CREATE TYPE "ClassificationField" AS ENUM ('TITLE', 'DESCRIPTION', 'SKILL');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('FRONTEND', 'BACKEND_FULLSTACK', 'ML_AI', 'AI_FIRST');

-- CreateEnum
CREATE TYPE "ForecastTargetMetric" AS ENUM ('VACANCY_COUNT', 'MARKET_SHARE');

-- CreateEnum
CREATE TYPE "ForecastDirection" AS ENUM ('UP', 'DOWN', 'STABLE');

-- CreateEnum
CREATE TYPE "ForecastStatus" AS ENUM ('READY', 'INSUFFICIENT_HISTORY', 'FAILED');

-- CreateTable
CREATE TABLE "QueryProfile" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "clusterHint" "RoleCluster" NOT NULL,
    "searchText" TEXT NOT NULL,
    "host" TEXT NOT NULL DEFAULT 'hh.ru',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'QUEUED',
    "sourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT,
    "totalProfiles" INTEGER NOT NULL DEFAULT 0,
    "processedProfiles" INTEGER NOT NULL DEFAULT 0,
    "foundVacancies" INTEGER NOT NULL DEFAULT 0,
    "fetchedDetails" INTEGER NOT NULL DEFAULT 0,
    "normalizedVacancies" INTEGER NOT NULL DEFAULT 0,
    "failedRequests" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawSourceRecord" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "recordType" "RawRecordType" NOT NULL,
    "externalId" TEXT,
    "requestUrl" TEXT NOT NULL,
    "requestParams" JSONB NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawSourceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacancy" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "employerName" TEXT,
    "areaId" TEXT,
    "areaName" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "employment" TEXT,
    "experience" TEXT,
    "schedule" TEXT,
    "salaryFrom" DECIMAL(14,2),
    "salaryTo" DECIMAL(14,2),
    "salaryCurrency" TEXT,
    "salaryGross" BOOLEAN,
    "primaryRoleCluster" "RoleCluster",
    "classificationConfidence" DECIMAL(5,4),
    "classificationVersion" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacancy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancySnapshot" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "syncRunId" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "descriptionHash" TEXT,
    "salaryFrom" DECIMAL(14,2),
    "salaryTo" DECIMAL(14,2),
    "salaryCurrency" TEXT,
    "cluster" "RoleCluster",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacancySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancyClassificationEvidence" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT NOT NULL,
    "cluster" "RoleCluster" NOT NULL,
    "field" "ClassificationField" NOT NULL,
    "matchedTerm" TEXT NOT NULL,
    "weight" DECIMAL(10,4) NOT NULL,
    "contribution" DECIMAL(10,4) NOT NULL,
    "classifierVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacancyClassificationEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacancySkill" (
    "vacancyId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "sourceField" "ClassificationField" NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VacancySkill_pkey" PRIMARY KEY ("vacancyId","skillId")
);

-- CreateTable
CREATE TABLE "DailyRoleMetric" (
    "id" TEXT NOT NULL,
    "metricDate" DATE NOT NULL,
    "sourceId" TEXT NOT NULL,
    "roleCluster" "RoleCluster" NOT NULL,
    "areaId" TEXT NOT NULL DEFAULT '',
    "vacancyCount" INTEGER NOT NULL DEFAULT 0,
    "classifiedVacancyCount" INTEGER NOT NULL DEFAULT 0,
    "marketShare" DECIMAL(8,6) NOT NULL,
    "salarySampleSize" INTEGER NOT NULL DEFAULT 0,
    "salaryCoverageRate" DECIMAL(8,6) NOT NULL,
    "medianSalaryMidpoint" DECIMAL(14,2),
    "averageSalaryMidpoint" DECIMAL(14,2),
    "uniqueEmployersCount" INTEGER NOT NULL DEFAULT 0,
    "avgClassificationConfidence" DECIMAL(5,4),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyRoleMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySkillMetric" (
    "id" TEXT NOT NULL,
    "metricDate" DATE NOT NULL,
    "roleCluster" "RoleCluster" NOT NULL,
    "skillId" TEXT NOT NULL,
    "vacancyCount" INTEGER NOT NULL DEFAULT 0,
    "shareWithinCluster" DECIMAL(8,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySkillMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL,
    "roleCluster" "RoleCluster" NOT NULL,
    "targetMetric" "ForecastTargetMetric" NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "modelName" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "trainStartDate" DATE NOT NULL,
    "trainEndDate" DATE NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "predictedValue" DECIMAL(14,6) NOT NULL,
    "lowerBound" DECIMAL(14,6),
    "upperBound" DECIMAL(14,6),
    "direction" "ForecastDirection" NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "riskFactors" JSONB NOT NULL,
    "explanation" JSONB NOT NULL,
    "status" "ForecastStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastPoint" (
    "id" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "forecastDate" DATE NOT NULL,
    "predictedValue" DECIMAL(14,6) NOT NULL,
    "lowerBound" DECIMAL(14,6),
    "upperBound" DECIMAL(14,6),
    "actualValue" DECIMAL(14,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastBacktest" (
    "id" TEXT NOT NULL,
    "roleCluster" "RoleCluster" NOT NULL,
    "targetMetric" "ForecastTargetMetric" NOT NULL,
    "modelName" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "trainStartDate" DATE NOT NULL,
    "trainEndDate" DATE NOT NULL,
    "testStartDate" DATE NOT NULL,
    "testEndDate" DATE NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "mae" DECIMAL(14,6),
    "mape" DECIMAL(14,6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastBacktest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QueryProfile_code_key" ON "QueryProfile"("code");

-- CreateIndex
CREATE INDEX "QueryProfile_clusterHint_isActive_idx" ON "QueryProfile"("clusterHint", "isActive");

-- CreateIndex
CREATE INDEX "QueryProfile_isActive_idx" ON "QueryProfile"("isActive");

-- CreateIndex
CREATE INDEX "SyncRun_status_createdAt_idx" ON "SyncRun"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SyncRun_sourceId_createdAt_idx" ON "SyncRun"("sourceId", "createdAt");

-- CreateIndex
CREATE INDEX "RawSourceRecord_syncRunId_recordType_idx" ON "RawSourceRecord"("syncRunId", "recordType");

-- CreateIndex
CREATE INDEX "RawSourceRecord_externalId_recordType_idx" ON "RawSourceRecord"("externalId", "recordType");

-- CreateIndex
CREATE INDEX "RawSourceRecord_fetchedAt_idx" ON "RawSourceRecord"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RawSourceRecord_sourceId_recordType_payloadHash_key" ON "RawSourceRecord"("sourceId", "recordType", "payloadHash");

-- CreateIndex
CREATE INDEX "Vacancy_primaryRoleCluster_publishedAt_idx" ON "Vacancy"("primaryRoleCluster", "publishedAt");

-- CreateIndex
CREATE INDEX "Vacancy_publishedAt_idx" ON "Vacancy"("publishedAt");

-- CreateIndex
CREATE INDEX "Vacancy_lastSeenAt_idx" ON "Vacancy"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Vacancy_areaId_idx" ON "Vacancy"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "Vacancy_sourceId_externalId_key" ON "Vacancy"("sourceId", "externalId");

-- CreateIndex
CREATE INDEX "VacancySnapshot_vacancyId_observedAt_idx" ON "VacancySnapshot"("vacancyId", "observedAt");

-- CreateIndex
CREATE INDEX "VacancySnapshot_syncRunId_idx" ON "VacancySnapshot"("syncRunId");

-- CreateIndex
CREATE INDEX "VacancyClassificationEvidence_vacancyId_cluster_idx" ON "VacancyClassificationEvidence"("vacancyId", "cluster");

-- CreateIndex
CREATE INDEX "VacancyClassificationEvidence_classifierVersion_idx" ON "VacancyClassificationEvidence"("classifierVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_code_key" ON "Skill"("code");

-- CreateIndex
CREATE INDEX "Skill_category_idx" ON "Skill"("category");

-- CreateIndex
CREATE INDEX "VacancySkill_skillId_idx" ON "VacancySkill"("skillId");

-- CreateIndex
CREATE INDEX "DailyRoleMetric_metricDate_roleCluster_idx" ON "DailyRoleMetric"("metricDate", "roleCluster");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRoleMetric_metricDate_sourceId_roleCluster_areaId_key" ON "DailyRoleMetric"("metricDate", "sourceId", "roleCluster", "areaId");

-- CreateIndex
CREATE INDEX "DailySkillMetric_roleCluster_metricDate_idx" ON "DailySkillMetric"("roleCluster", "metricDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailySkillMetric_metricDate_roleCluster_skillId_key" ON "DailySkillMetric"("metricDate", "roleCluster", "skillId");

-- CreateIndex
CREATE INDEX "Forecast_roleCluster_targetMetric_horizonDays_generatedAt_idx" ON "Forecast"("roleCluster", "targetMetric", "horizonDays", "generatedAt");

-- CreateIndex
CREATE INDEX "Forecast_status_generatedAt_idx" ON "Forecast"("status", "generatedAt");

-- CreateIndex
CREATE INDEX "ForecastPoint_forecastDate_idx" ON "ForecastPoint"("forecastDate");

-- CreateIndex
CREATE UNIQUE INDEX "ForecastPoint_forecastId_forecastDate_key" ON "ForecastPoint"("forecastId", "forecastDate");

-- CreateIndex
CREATE INDEX "ForecastBacktest_roleCluster_targetMetric_evaluatedAt_idx" ON "ForecastBacktest"("roleCluster", "targetMetric", "evaluatedAt");

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawSourceRecord" ADD CONSTRAINT "RawSourceRecord_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawSourceRecord" ADD CONSTRAINT "RawSourceRecord_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacancy" ADD CONSTRAINT "Vacancy_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancySnapshot" ADD CONSTRAINT "VacancySnapshot_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancySnapshot" ADD CONSTRAINT "VacancySnapshot_syncRunId_fkey" FOREIGN KEY ("syncRunId") REFERENCES "SyncRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancyClassificationEvidence" ADD CONSTRAINT "VacancyClassificationEvidence_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancySkill" ADD CONSTRAINT "VacancySkill_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacancySkill" ADD CONSTRAINT "VacancySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRoleMetric" ADD CONSTRAINT "DailyRoleMetric_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySkillMetric" ADD CONSTRAINT "DailySkillMetric_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastPoint" ADD CONSTRAINT "ForecastPoint_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "Forecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
