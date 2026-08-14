import { ForecastStatus, MarketPeriod, RoleCluster } from '@dev-market-oracle/shared-types';
import { baseApi } from '../api/baseApi';

export interface DataWindowDto {
  start: string;
  end: string;
  daysRequested?: number;
  daysWithData: number;
}

export interface OverviewClusterDto {
  roleCluster: RoleCluster;
  vacancyCount: number;
  marketShare: number;
  medianSalaryMidpoint: number | null;
  averageSalaryMidpoint: number | null;
  salaryCoverageRate: number;
  salarySampleSize: number;
  uniqueEmployersCount: number;
  avgClassificationConfidence: number | null;
  growthRate: number;
  previousVacancyCount: number;
  sampleSize: number;
}

export interface OverviewResponse {
  lastUpdatedAt: string | null;
  period: MarketPeriod;
  source: string;
  dataWindow: DataWindowDto;
  coverage: {
    totalVacancies: number;
    classifiedVacanciesInPeriod: number;
    salaryCoverageRate: number;
    historyStatus: ForecastStatus | 'READY' | 'INSUFFICIENT_HISTORY';
    daysNeededForForecast: number;
  };
  roleClusters: OverviewClusterDto[];
  keyObservation: {
    code: string;
    roleCluster: RoleCluster | null;
    message: string;
  };
  caveats: string[];
}

export interface TrendsResponse {
  metric: string;
  period: MarketPeriod;
  source: string;
  dataWindow: DataWindowDto;
  historyStatus: 'READY' | 'INSUFFICIENT_HISTORY';
  series: Array<{
    date: string;
    roleCluster: RoleCluster;
    value: number;
    sampleSize: number;
  }>;
  caveats: string[];
}

export interface CompareResponse {
  period: MarketPeriod;
  source: string;
  metric: string;
  dataWindow: DataWindowDto;
  historyStatus: string;
  rows: Array<{
    roleCluster: RoleCluster;
    current: number | null;
    previousVacancyCount: number;
    growthRate: number;
    marketShare: number;
    sampleSize: number;
  }>;
  caveats: string[];
}

export interface SkillsTrendingResponse {
  period: MarketPeriod;
  cluster: string;
  dataWindow: DataWindowDto;
  historyStatus: string;
  items: Array<{
    roleCluster: RoleCluster;
    skill: { code: string; name: string };
    currentCount: number;
    previousCount: number;
    growthRate: number | null;
    shareWithinCluster: number;
    dataNotes: string[];
  }>;
  caveats: string[];
}

export interface SkillsMatrixResponse {
  period: MarketPeriod;
  dataWindow: DataWindowDto;
  historyStatus: string;
  matrix: Array<{
    roleCluster: RoleCluster;
    skills: Array<{
      skill: { code: string; name: string };
      vacancyCount: number;
      shareWithinCluster: number;
    }>;
  }>;
  caveats: string[];
}

export const marketApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOverview: build.query<OverviewResponse, { period: MarketPeriod; source: string }>({
      query: ({ period, source }) => ({
        url: '/market/overview',
        params: { period, source },
      }),
      providesTags: ['Overview'],
    }),
    getTrends: build.query<
      TrendsResponse,
      {
        period: MarketPeriod;
        source: string;
        metric: string;
        clusters?: RoleCluster[];
      }
    >({
      query: ({ period, source, metric, clusters }) => ({
        url: '/market/trends',
        params: {
          period,
          source,
          metric,
          ...(clusters && clusters.length > 0 ? { clusters } : {}),
        },
      }),
      providesTags: ['Trends'],
    }),
    getCompare: build.query<
      CompareResponse,
      { period: MarketPeriod; source: string; metric: string }
    >({
      query: ({ period, source, metric }) => ({
        url: '/market/compare',
        params: { period, source, metric },
      }),
      providesTags: ['Compare'],
    }),
    getSkillsTrending: build.query<
      SkillsTrendingResponse,
      { period: MarketPeriod; cluster?: RoleCluster; limit?: number }
    >({
      query: ({ period, cluster, limit }) => ({
        url: '/skills/trending',
        params: { period, cluster, limit },
      }),
      providesTags: ['Skills'],
    }),
    getSkillsMatrix: build.query<
      SkillsMatrixResponse,
      { period: MarketPeriod; limitPerCluster?: number }
    >({
      query: ({ period, limitPerCluster }) => ({
        url: '/skills/matrix',
        params: { period, limitPerCluster },
      }),
      providesTags: ['Skills'],
    }),
  }),
});

export const {
  useGetOverviewQuery,
  useGetTrendsQuery,
  useGetCompareQuery,
  useGetSkillsTrendingQuery,
  useGetSkillsMatrixQuery,
} = marketApi;
