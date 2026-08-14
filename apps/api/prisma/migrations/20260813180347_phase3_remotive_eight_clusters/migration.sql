-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleCluster" ADD VALUE 'BACKEND';
ALTER TYPE "RoleCluster" ADD VALUE 'MOBILE';
ALTER TYPE "RoleCluster" ADD VALUE 'DEVOPS';
ALTER TYPE "RoleCluster" ADD VALUE 'DATA_ENGINEERING';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SkillCategory" ADD VALUE 'MOBILE';
ALTER TYPE "SkillCategory" ADD VALUE 'DEVOPS';
ALTER TYPE "SkillCategory" ADD VALUE 'DATA_ENGINEERING';

-- AlterTable
ALTER TABLE "QueryProfile" ADD COLUMN     "sourceCode" TEXT NOT NULL DEFAULT 'HH';

-- CreateIndex
CREATE INDEX "QueryProfile_sourceCode_isActive_idx" ON "QueryProfile"("sourceCode", "isActive");
