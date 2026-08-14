import { SyncStatus } from '@dev-market-oracle/shared-types';
import { baseApi } from '../api/baseApi';

export interface SyncRunDto {
  id: string;
  status: SyncStatus;
  sourceId?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  requestedAt?: string;
  queuedAt?: string;
  totalProfiles: number;
  processedProfiles?: number;
  foundVacancies?: number;
  fetchedDetails?: number;
  normalizedVacancies?: number;
  failedRequests?: number;
  errorSummary?: string | null;
  metadata?: Record<string, unknown> | null;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
  sourceCodes?: string[];
  profileCodes?: string[];
}

export interface SyncRunsListResponse {
  items: SyncRunDto[];
  page: number;
  pageSize: number;
  total: number;
}

export const syncApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listSyncRuns: build.query<
      SyncRunsListResponse,
      { page?: number; pageSize?: number; status?: string }
    >({
      query: (params) => ({
        url: '/sync/runs',
        params,
      }),
      providesTags: ['SyncRuns'],
    }),
    getSyncRun: build.query<SyncRunDto, string>({
      query: (id) => `/sync/runs/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SyncRuns', id }],
    }),
    startSync: build.mutation<
      SyncRunDto,
      {
        profileCodes?: string[];
        sourceCodes?: string[];
        forceRefresh?: boolean;
      }
    >({
      query: (body) => ({
        url: '/sync/runs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SyncRuns'],
    }),
  }),
});

export const { useListSyncRunsQuery, useGetSyncRunQuery, useStartSyncMutation } = syncApi;
