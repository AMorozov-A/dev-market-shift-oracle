import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SyncStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import type { EnvConfig } from '../config/env.validation';
import { SourcesService } from '../sources/sources.service';
import { CreateSyncRunDto, ListSyncRunsQueryDto } from './dto/sync.dto';
import { SyncRepository } from './sync.repository';

export const MARKET_SYNC_QUEUE = 'market-sync';
export const RUN_SYNC_JOB = 'run-sync';

@Injectable()
export class SyncService {
  constructor(
    private readonly syncRepository: SyncRepository,
    private readonly sourcesService: SourcesService,
    private readonly config: ConfigService<EnvConfig, true>,
    @InjectQueue(MARKET_SYNC_QUEUE) private readonly syncQueue: Queue,
  ) {}

  async startSync(dto: CreateSyncRunDto) {
    const active = await this.syncRepository.findActiveSyncRun();
    if (active) {
      throw new ConflictException(
        `Another sync is already ${active.status} (id=${active.id})`,
      );
    }

    const defaultSources = this.config
      .get('SYNC_DEFAULT_SOURCE_CODES', { infer: true })
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const sourceCodes = dto.sourceCodes?.length
      ? dto.sourceCodes
      : defaultSources;
    const primarySource = await this.sourcesService.getByCodeOrThrow(
      sourceCodes[0] ?? 'REMOTEOK',
    );

    const maxProfiles = this.config.get('SYNC_MAX_PROFILES_PER_RUN', {
      infer: true,
    });
    const profiles = await this.syncRepository.findQueryProfiles({
      codes: dto.profileCodes,
      sourceCodes,
      take: maxProfiles,
    });

    const syncRun = await this.syncRepository.createSyncRun({
      sourceId: primarySource.id,
      totalProfiles: profiles.length,
      metadata: {
        profileCodes:
          dto.profileCodes ?? profiles.map((profile) => profile.code),
        sourceCodes,
        forceRefresh: Boolean(dto.forceRefresh),
        queuedProfileCodes: profiles.map((profile) => profile.code),
      },
    });

    await this.syncQueue.add(
      RUN_SYNC_JOB,
      { syncRunId: syncRun.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 20,
        removeOnFail: 50,
        jobId: `run-sync-${syncRun.id}`,
      },
    );

    return {
      id: syncRun.id,
      status: syncRun.status,
      queuedAt: syncRun.requestedAt.toISOString(),
      totalProfiles: syncRun.totalProfiles,
      sourceCodes,
      profileCodes: profiles.map((profile) => profile.code),
    };
  }

  async getSyncRun(id: string) {
    const syncRun = await this.syncRepository.findSyncRunById(id);
    if (!syncRun) {
      throw new NotFoundException(`SyncRun not found: ${id}`);
    }
    return this.toResponse(syncRun);
  }

  async listSyncRuns(query: ListSyncRunsQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const status = query.status
      ? (query.status.toUpperCase() as SyncStatus)
      : undefined;

    if (status && !Object.values(SyncStatus).includes(status)) {
      throw new NotFoundException(`Unknown sync status: ${query.status}`);
    }

    const { items, total } = await this.syncRepository.listSyncRuns({
      status,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      page,
      pageSize,
      total,
      items: items.map((item) => this.toResponse(item)),
    };
  }

  private toResponse(syncRun: {
    id: string;
    status: SyncStatus;
    sourceId: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    requestedAt: Date;
    totalProfiles: number;
    processedProfiles: number;
    foundVacancies: number;
    fetchedDetails: number;
    normalizedVacancies: number;
    failedRequests: number;
    errorSummary: string | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const progress =
      syncRun.totalProfiles === 0
        ? 0
        : Math.min(1, syncRun.processedProfiles / syncRun.totalProfiles);

    return {
      id: syncRun.id,
      status: syncRun.status,
      sourceId: syncRun.sourceId,
      requestedAt: syncRun.requestedAt.toISOString(),
      startedAt: syncRun.startedAt?.toISOString() ?? null,
      finishedAt: syncRun.finishedAt?.toISOString() ?? null,
      totalProfiles: syncRun.totalProfiles,
      processedProfiles: syncRun.processedProfiles,
      foundVacancies: syncRun.foundVacancies,
      fetchedDetails: syncRun.fetchedDetails,
      normalizedVacancies: syncRun.normalizedVacancies,
      failedRequests: syncRun.failedRequests,
      errorSummary: syncRun.errorSummary,
      metadata: syncRun.metadata,
      progress,
      createdAt: syncRun.createdAt.toISOString(),
      updatedAt: syncRun.updatedAt.toISOString(),
    };
  }
}
