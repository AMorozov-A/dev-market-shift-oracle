import { Injectable } from '@nestjs/common';
import {
  Prisma,
  QueryProfile,
  RawRecordType,
  SyncRun,
  SyncStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { sha256Hex, stableJsonStringify } from '../common/utils/hash.util';

@Injectable()
export class SyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveSyncRun(): Promise<SyncRun | null> {
    return this.prisma.syncRun.findFirst({
      where: { status: { in: [SyncStatus.QUEUED, SyncStatus.RUNNING] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  createSyncRun(data: {
    sourceId: string;
    totalProfiles: number;
    metadata: Prisma.InputJsonValue;
  }): Promise<SyncRun> {
    return this.prisma.syncRun.create({
      data: {
        status: SyncStatus.QUEUED,
        sourceId: data.sourceId,
        totalProfiles: data.totalProfiles,
        metadata: data.metadata,
        requestedAt: new Date(),
      },
    });
  }

  updateSyncRun(id: string, data: Prisma.SyncRunUpdateInput): Promise<SyncRun> {
    return this.prisma.syncRun.update({ where: { id }, data });
  }

  findSyncRunById(id: string): Promise<SyncRun | null> {
    return this.prisma.syncRun.findUnique({ where: { id } });
  }

  listSyncRuns(params: {
    status?: SyncStatus;
    skip: number;
    take: number;
  }): Promise<{ items: SyncRun[]; total: number }> {
    const where = params.status ? { status: params.status } : {};
    return Promise.all([
      this.prisma.syncRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.syncRun.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  async saveRawRecord(input: {
    sourceId: string;
    syncRunId: string;
    recordType: RawRecordType;
    externalId?: string | null;
    requestUrl: string;
    requestParams: Prisma.InputJsonValue;
    httpStatus: number;
    payload: Prisma.InputJsonValue;
  }): Promise<void> {
    const payloadHash = sha256Hex(stableJsonStringify(input.payload));
    await this.prisma.rawSourceRecord.upsert({
      where: {
        sourceId_recordType_payloadHash: {
          sourceId: input.sourceId,
          recordType: input.recordType,
          payloadHash,
        },
      },
      create: {
        sourceId: input.sourceId,
        syncRunId: input.syncRunId,
        recordType: input.recordType,
        externalId: input.externalId ?? null,
        requestUrl: input.requestUrl,
        requestParams: input.requestParams,
        httpStatus: input.httpStatus,
        fetchedAt: new Date(),
        payload: input.payload,
        payloadHash,
      },
      update: {
        syncRunId: input.syncRunId,
        externalId: input.externalId ?? null,
        requestUrl: input.requestUrl,
        requestParams: input.requestParams,
        httpStatus: input.httpStatus,
        fetchedAt: new Date(),
      },
    });
  }

  findQueryProfiles(params: {
    codes?: string[];
    sourceCodes?: string[];
    take?: number;
  }): Promise<QueryProfile[]> {
    return this.prisma.queryProfile.findMany({
      where: {
        isActive: true,
        ...(params.codes?.length ? { code: { in: params.codes } } : {}),
        ...(params.sourceCodes?.length
          ? { sourceCode: { in: params.sourceCodes } }
          : {}),
      },
      orderBy: [{ sourceCode: 'asc' }, { code: 'asc' }],
      ...(params.take ? { take: params.take } : {}),
    });
  }
}
