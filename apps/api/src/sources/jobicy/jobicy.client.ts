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
import { mapJobicyDetails, mapJobicySearchHit } from './jobicy.mapper';
import type { JobicyResponse } from './jobicy.types';

@Injectable()
export class JobicyClient implements VacancySourceProvider {
  readonly code = 'JOBICY';
  private readonly logger = new Logger(JobicyClient.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async search(params: VacancySearchParams): Promise<VacancySearchResult> {
    const baseUrl = this.config
      .get('JOBICY_BASE_URL', { infer: true })
      .replace(/\/$/, '');
    const timeoutMs = this.config.get('JOBICY_REQUEST_TIMEOUT_MS', {
      infer: true,
    });
    const count = Math.min(50, Math.max(1, params.perPage));
    const tag = params.text.trim().toLowerCase();

    const query = new URLSearchParams({ count: String(count) });
    if (tag) {
      query.set('tag', tag);
    }
    const requestUrl = `${baseUrl}/api/v2/remote-jobs?${query.toString()}`;
    const requestParams = { count, tag: tag || null, page: params.page };

    this.logger.debug(`Jobicy search ${requestUrl}`);
    const response = await fetchJsonWithRetry({
      url: requestUrl,
      timeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DevMarketShiftOracle/1.0',
      },
    });

    const raw = response.data as JobicyResponse;
    const items = (raw.jobs ?? []).map(mapJobicySearchHit);

    return {
      found: raw.jobCount ?? items.length,
      page: params.page,
      pages: 1,
      items,
      requestUrl,
      requestParams,
      httpStatus: response.status,
      raw,
    };
  }

  async getVacancyDetails(externalId: string): Promise<VacancyDetails> {
    const baseUrl = this.config
      .get('JOBICY_BASE_URL', { infer: true })
      .replace(/\/$/, '');
    const timeoutMs = this.config.get('JOBICY_REQUEST_TIMEOUT_MS', {
      infer: true,
    });
    const requestUrl = `${baseUrl}/api/v2/remote-jobs?count=50`;
    const requestParams = { count: 50, id: externalId };

    const response = await fetchJsonWithRetry({
      url: requestUrl,
      timeoutMs,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'DevMarketShiftOracle/1.0',
      },
    });

    const raw = response.data as JobicyResponse;
    const job = (raw.jobs ?? []).find((item) => String(item.id) === externalId);
    if (!job) {
      throw new NotFoundException(`Jobicy job not found: ${externalId}`);
    }

    return mapJobicyDetails(job, {
      requestUrl,
      requestParams,
      httpStatus: response.status,
    });
  }
}
