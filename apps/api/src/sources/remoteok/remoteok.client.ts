import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { fetchJsonWithRetry } from '../../common/utils/http.util';
import type {
  VacancyDetails,
  VacancySearchParams,
  VacancySearchResult,
  VacancySourceProvider,
} from '../providers/vacancy-source-provider.interface';
import { mapRemoteOkDetails, mapRemoteOkSearchHit } from './remoteok.mapper';
import type { RemoteOkJob, RemoteOkResponse } from './remoteok.types';

@Injectable()
export class RemoteOkClient implements VacancySourceProvider {
  readonly code = 'REMOTEOK';
  private readonly logger = new Logger(RemoteOkClient.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async search(params: VacancySearchParams): Promise<VacancySearchResult> {
    const baseUrl = this.config
      .get('REMOTEOK_BASE_URL', { infer: true })
      .replace(/\/$/, '');
    const timeoutMs = this.config.get('REMOTEOK_REQUEST_TIMEOUT_MS', {
      infer: true,
    });
    const limit = Math.max(1, params.perPage);
    const tag = params.text.trim().toLowerCase().replace(/\s+/g, '-');
    const query = tag ? `?tags=${encodeURIComponent(tag)}` : '';
    const requestUrl = `${baseUrl}/api${query}`;
    const requestParams = {
      tags: tag || null,
      page: params.page,
      limit,
    };

    this.logger.debug(`RemoteOK search ${requestUrl}`);
    const response = await fetchJsonWithRetry({
      url: requestUrl,
      timeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DevMarketShiftOracle/1.0',
      },
    });

    const raw = response.data as RemoteOkResponse;
    const jobs = (Array.isArray(raw) ? raw : [])
      .map(mapRemoteOkSearchHit)
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // API has no pagination; emulate pages locally.
    const start = params.page * limit;
    const pageItems = jobs.slice(start, start + limit);
    const pages = Math.max(1, Math.ceil(jobs.length / limit));

    return {
      found: jobs.length,
      page: params.page,
      pages,
      items: pageItems,
      requestUrl,
      requestParams,
      httpStatus: response.status,
      raw,
    };
  }

  async getVacancyDetails(externalId: string): Promise<VacancyDetails> {
    const baseUrl = this.config
      .get('REMOTEOK_BASE_URL', { infer: true })
      .replace(/\/$/, '');
    const timeoutMs = this.config.get('REMOTEOK_REQUEST_TIMEOUT_MS', {
      infer: true,
    });
    const requestUrl = `${baseUrl}/api`;
    const requestParams = { id: externalId };

    const response = await fetchJsonWithRetry({
      url: requestUrl,
      timeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DevMarketShiftOracle/1.0',
      },
    });

    const raw = response.data as RemoteOkResponse;
    const job = (Array.isArray(raw) ? raw : []).find(
      (item: RemoteOkJob) => String(item.id) === externalId,
    );
    if (!job) {
      throw new NotFoundException(`RemoteOK job not found: ${externalId}`);
    }

    return mapRemoteOkDetails(job, {
      requestUrl,
      requestParams,
      httpStatus: response.status,
    });
  }
}
