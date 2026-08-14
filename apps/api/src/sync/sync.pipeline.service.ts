import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, RawRecordType, SyncStatus } from '@prisma/client';
import type { EnvConfig } from '../config/env.validation';
import {
  HttpRequestError,
  mapWithConcurrency,
} from '../common/utils/http.util';
import { SourcesService } from '../sources/sources.service';
import { VacancySourceRegistry } from '../sources/vacancy-source.registry';
import type {
  VacancyDetails,
  VacancySearchHit,
} from '../sources/providers/vacancy-source-provider.interface';
import { VacanciesRepository } from '../vacancies/vacancies.repository';
import { VacancyEnrichmentService } from '../vacancies/vacancy-enrichment.service';
import { MetricsAggregationService } from '../analytics/metrics-aggregation.service';
import { ForecastService } from '../forecast/forecast.service';
import { SyncRepository } from './sync.repository';

function detailsFromSearchHit(
  hit: VacancySearchHit,
  meta: {
    requestUrl: string;
    requestParams: Record<string, unknown>;
    httpStatus: number;
  },
): VacancyDetails {
  return {
    externalId: hit.externalId,
    url: hit.url,
    title: hit.title,
    description: hit.description ?? null,
    keySkills: hit.keySkills ?? [],
    employerName: hit.employerName ?? null,
    areaId: null,
    areaName: null,
    publishedAt: hit.publishedAt,
    archived: false,
    employment: null,
    experience: null,
    schedule: null,
    salaryFrom: null,
    salaryTo: null,
    salaryCurrency: null,
    salaryGross: null,
    requestUrl: meta.requestUrl,
    requestParams: meta.requestParams,
    httpStatus: meta.httpStatus,
    raw: hit.raw,
  };
}

@Injectable()
export class SyncPipelineService {
  private readonly logger = new Logger(SyncPipelineService.name);

  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly syncRepository: SyncRepository,
    private readonly sourcesService: SourcesService,
    private readonly sourceRegistry: VacancySourceRegistry,
    private readonly vacanciesRepository: VacanciesRepository,
    private readonly vacancyEnrichment: VacancyEnrichmentService,
    private readonly metricsAggregation: MetricsAggregationService,
    private readonly forecastService: ForecastService,
  ) {}

  async run(syncRunId: string): Promise<void> {
    const syncRun = await this.syncRepository.findSyncRunById(syncRunId);
    if (!syncRun) {
      throw new Error(`SyncRun not found: ${syncRunId}`);
    }

    const metadata = (syncRun.metadata ?? {}) as {
      profileCodes?: string[];
      sourceCodes?: string[];
      forceRefresh?: boolean;
    };

    await this.syncRepository.updateSyncRun(syncRunId, {
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
      errorSummary: null,
    });

    let processedProfiles = 0;
    let foundVacancies = 0;
    let fetchedDetails = 0;
    let normalizedVacancies = 0;
    let failedRequests = 0;
    const errors: string[] = [];

    try {
      const profiles = await this.syncRepository.findQueryProfiles({
        codes: metadata.profileCodes,
        sourceCodes: metadata.sourceCodes,
        take: this.config.get('SYNC_MAX_PROFILES_PER_RUN', { infer: true }),
      });

      await this.syncRepository.updateSyncRun(syncRunId, {
        totalProfiles: profiles.length,
      });

      const hitsBySource = new Map<string, Map<string, VacancySearchHit>>();

      for (const profile of profiles) {
        try {
          const source = await this.sourcesService.getByCodeOrThrow(
            profile.sourceCode,
          );
          const provider = this.sourceRegistry.get(profile.sourceCode);
          const perPage = 20;

          try {
            const searchResult = await provider.search({
              text: profile.searchText,
              host: profile.host,
              page: 0,
              perPage,
            });

            await this.syncRepository.saveRawRecord({
              sourceId: source.id,
              syncRunId,
              recordType: RawRecordType.SEARCH_RESPONSE,
              requestUrl: searchResult.requestUrl,
              requestParams: {
                ...searchResult.requestParams,
                profileCode: profile.code,
              },
              httpStatus: searchResult.httpStatus,
              payload: searchResult.raw as Prisma.InputJsonValue,
            });

            foundVacancies += searchResult.items.length;
            const bucket =
              hitsBySource.get(source.id) ??
              new Map<string, VacancySearchHit>();
            for (const item of searchResult.items) {
              bucket.set(item.externalId, item);
            }
            hitsBySource.set(source.id, bucket);
          } catch (error: unknown) {
            failedRequests += 1;
            errors.push(this.formatError(`search:${profile.code}:p0`, error));
            if (error instanceof HttpRequestError) {
              await this.syncRepository.saveRawRecord({
                sourceId: source.id,
                syncRunId,
                recordType: RawRecordType.SEARCH_RESPONSE,
                requestUrl: error.url,
                requestParams: {
                  profileCode: profile.code,
                  page: 0,
                  text: profile.searchText,
                },
                httpStatus: error.statusCode ?? 0,
                payload: {
                  error: error.message,
                  body: error.body,
                } as Prisma.InputJsonValue,
              });
            }
          }

          processedProfiles += 1;
          await this.syncRepository.updateSyncRun(syncRunId, {
            processedProfiles,
            foundVacancies,
            failedRequests,
          });
        } catch (error: unknown) {
          failedRequests += 1;
          errors.push(this.formatError(`profile:${profile.code}`, error));
        }
      }

      for (const [sourceId, hits] of hitsBySource.entries()) {
        const source = (await this.sourcesService.listActive()).find(
          (item) => item.id === sourceId,
        );
        if (!source) {
          continue;
        }

        const provider = this.sourceRegistry.get(source.code);
        const refreshHours =
          source.code === 'REMOTEOK'
            ? this.config.get('REMOTEOK_REFRESH_AFTER_HOURS', { infer: true })
            : this.config.get('JOBICY_REFRESH_AFTER_HOURS', { infer: true });
        const detailsLimit =
          source.code === 'REMOTEOK'
            ? this.config.get('REMOTEOK_DETAILS_LIMIT_PER_RUN', { infer: true })
            : this.config.get('JOBICY_DETAILS_LIMIT_PER_RUN', { infer: true });
        const concurrency =
          source.code === 'REMOTEOK'
            ? this.config.get('REMOTEOK_MAX_CONCURRENCY', { infer: true })
            : this.config.get('JOBICY_MAX_CONCURRENCY', { infer: true });

        const candidates = [...hits.values()].slice(0, detailsLimit);
        const toFetch: VacancySearchHit[] = [];

        for (const hit of candidates) {
          const existing =
            await this.vacanciesRepository.findBySourceExternalId(
              sourceId,
              hit.externalId,
            );
          const stale =
            !existing ||
            metadata.forceRefresh ||
            Date.now() - existing.lastSeenAt.getTime() >
              refreshHours * 3600_000;

          if (!stale) {
            continue;
          }

          if (hit.description) {
            const details = detailsFromSearchHit(hit, {
              requestUrl: `${source.code.toLowerCase()}:search-item`,
              requestParams: { externalId: hit.externalId, fromSearch: true },
              httpStatus: 200,
            });
            await this.persistDetails(syncRunId, sourceId, details);
            fetchedDetails += 1;
            normalizedVacancies += 1;
            continue;
          }

          toFetch.push(hit);
        }

        await mapWithConcurrency(toFetch, concurrency, async (hit) => {
          try {
            const details = await provider.getVacancyDetails(hit.externalId);
            await this.persistDetails(syncRunId, sourceId, details);
            fetchedDetails += 1;
            normalizedVacancies += 1;
          } catch (error: unknown) {
            failedRequests += 1;
            errors.push(
              this.formatError(
                `details:${source.code}:${hit.externalId}`,
                error,
              ),
            );
          }
          return undefined;
        });

        await this.syncRepository.updateSyncRun(syncRunId, {
          fetchedDetails,
          normalizedVacancies,
          failedRequests,
        });
      }

      const enrichment = await this.vacancyEnrichment.enrichPending();
      const metrics = await this.metricsAggregation.recalculate();
      const forecasts = await this.forecastService.generateAll();

      const status =
        failedRequests === 0
          ? SyncStatus.COMPLETED
          : processedProfiles > 0
            ? SyncStatus.PARTIALLY_COMPLETED
            : SyncStatus.FAILED;

      await this.syncRepository.updateSyncRun(syncRunId, {
        status,
        finishedAt: new Date(),
        processedProfiles,
        foundVacancies,
        fetchedDetails,
        normalizedVacancies,
        failedRequests,
        errorSummary: errors.length ? errors.slice(0, 20).join('\n') : null,
        metadata: {
          ...metadata,
          errorCount: errors.length,
          enrichedPending: enrichment.processed,
          metrics,
          forecasts,
        },
      });
    } catch (error: unknown) {
      this.logger.error(error);
      await this.syncRepository.updateSyncRun(syncRunId, {
        status: SyncStatus.FAILED,
        finishedAt: new Date(),
        failedRequests: failedRequests + 1,
        errorSummary: this.formatError('pipeline', error),
      });
      throw error;
    }
  }

  private async persistDetails(
    syncRunId: string,
    sourceId: string,
    details: VacancyDetails,
  ): Promise<void> {
    await this.syncRepository.saveRawRecord({
      sourceId,
      syncRunId,
      recordType: RawRecordType.VACANCY_DETAIL,
      externalId: details.externalId,
      requestUrl: details.requestUrl,
      requestParams: details.requestParams as Prisma.InputJsonValue,
      httpStatus: details.httpStatus,
      payload: details.raw as Prisma.InputJsonValue,
    });
    const vacancy = await this.vacanciesRepository.upsertFromDetails(
      sourceId,
      details,
    );
    await this.vacancyEnrichment.enrichVacancy(vacancy.id, {
      title: details.title,
      description: details.description,
      keySkills: details.keySkills,
    });
  }

  private formatError(context: string, error: unknown): string {
    if (error instanceof HttpRequestError) {
      return `${context}: HTTP ${error.statusCode ?? 'n/a'} ${error.message}`;
    }
    if (error instanceof Error) {
      return `${context}: ${error.message}`;
    }
    return `${context}: unknown error`;
  }
}
