import { Injectable } from '@nestjs/common';
import { Prisma, RoleCluster, Vacancy } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { VacancyDetails } from '../sources/providers/vacancy-source-provider.interface';
import type { ExtractedSkill } from '../skills/skill-extractor.service';
import type { ClassifierResult } from '../taxonomy/role-classifier.service';

@Injectable()
export class VacanciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySourceExternalId(
    sourceId: string,
    externalId: string,
  ): Promise<Vacancy | null> {
    return this.prisma.vacancy.findUnique({
      where: {
        sourceId_externalId: { sourceId, externalId },
      },
    });
  }

  findManyForEnrichment(take = 500): Promise<Vacancy[]> {
    return this.prisma.vacancy.findMany({
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  findManyNeedingEnrichment(
    classificationVersion: string,
    take = 500,
  ): Promise<Vacancy[]> {
    return this.prisma.vacancy.findMany({
      where: {
        OR: [
          { classificationVersion: 'pending' },
          { classificationVersion: { not: classificationVersion } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take,
    });
  }

  upsertFromDetails(
    sourceId: string,
    details: VacancyDetails,
  ): Promise<Vacancy> {
    const now = new Date();
    const publishedAt = new Date(details.publishedAt);
    const data = {
      url: details.url,
      title: details.title,
      description: details.description,
      employerName: details.employerName,
      areaId: details.areaId,
      areaName: details.areaName,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? now : publishedAt,
      archived: details.archived,
      employment: details.employment,
      experience: details.experience,
      schedule: details.schedule,
      salaryFrom:
        details.salaryFrom === null
          ? null
          : new Prisma.Decimal(details.salaryFrom),
      salaryTo:
        details.salaryTo === null ? null : new Prisma.Decimal(details.salaryTo),
      salaryCurrency: details.salaryCurrency,
      salaryGross: details.salaryGross,
      lastSeenAt: now,
    };

    return this.prisma.vacancy.upsert({
      where: {
        sourceId_externalId: { sourceId, externalId: details.externalId },
      },
      create: {
        sourceId,
        externalId: details.externalId,
        firstSeenAt: now,
        classificationVersion: 'pending',
        ...data,
      },
      update: data,
    });
  }

  async saveClassification(
    vacancyId: string,
    result: ClassifierResult,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.vacancyClassificationEvidence.deleteMany({
        where: { vacancyId },
      });
      await tx.vacancy.update({
        where: { id: vacancyId },
        data: {
          primaryRoleCluster: result.primaryCluster,
          classificationConfidence: new Prisma.Decimal(result.confidence),
          classificationVersion: result.classificationVersion,
        },
      });

      if (result.matchedSignals.length > 0) {
        await tx.vacancyClassificationEvidence.createMany({
          data: result.matchedSignals.map((signal) => ({
            vacancyId,
            cluster: signal.cluster,
            field: signal.field,
            matchedTerm: signal.matchedTerm,
            weight: new Prisma.Decimal(signal.weight),
            contribution: new Prisma.Decimal(signal.contribution),
            classifierVersion: result.classificationVersion,
          })),
        });
      }
    });
  }

  async saveSkills(
    vacancyId: string,
    skills: ExtractedSkill[],
    skillIdByCode: Map<string, string>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.vacancySkill.deleteMany({ where: { vacancyId } });
      const rows = skills
        .map((skill) => {
          const skillId = skillIdByCode.get(skill.code);
          if (!skillId) {
            return null;
          }
          return {
            vacancyId,
            skillId,
            sourceField: skill.sourceField,
            confidence: new Prisma.Decimal(skill.confidence),
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (rows.length > 0) {
        await tx.vacancySkill.createMany({ data: rows });
      }
    });
  }

  countByCluster(): Promise<
    Array<{ primaryRoleCluster: RoleCluster | null; _count: number }>
  > {
    return this.prisma.vacancy
      .groupBy({
        by: ['primaryRoleCluster'],
        _count: { _all: true },
      })
      .then((rows) =>
        rows.map((row) => ({
          primaryRoleCluster: row.primaryRoleCluster,
          _count: row._count._all,
        })),
      );
  }
}
