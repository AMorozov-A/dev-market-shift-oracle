import {
  ForecastDirection,
  ForecastStatus,
  ForecastTargetMetric,
  RoleCluster,
} from '@dev-market-oracle/shared-types';
import { baseApi } from '../api/baseApi';

export interface ForecastListItem {
  id: string;
  roleCluster: RoleCluster;
  targetMetric: ForecastTargetMetric;
  horizonDays: number;
  modelName: string;
  modelVersion: string;
  trainStartDate: string;
  trainEndDate: string;
  generatedAt: string;
  predictedValue: number;
  lowerBound: number | null;
  upperBound: number | null;
  direction: ForecastDirection;
  confidence: number;
  sampleSize: number;
  riskFactors: unknown;
  explanation: unknown;
  status: ForecastStatus;
}

export interface ForecastDetail extends ForecastListItem {
  points: Array<{
    forecastDate: string;
    predictedValue: number;
    lowerBound: number | null;
    upperBound: number | null;
    actualValue: number | null;
  }>;
  backtest: {
    id: string;
    mae: number | null;
    mape: number | null;
    sampleSize: number;
    evaluatedAt: string;
    trainStartDate: string;
    trainEndDate: string;
    testStartDate: string;
    testEndDate: string;
  } | null;
}

export interface ForecastExplain {
  forecastId: string;
  status: ForecastStatus;
  model: { name: string; version: string };
  trainWindow: { start: string; end: string };
  dataQuality: { sampleSize: number; historyStatus: ForecastStatus };
  drivers: unknown;
  risks: unknown;
  backtest: ForecastDetail['backtest'];
  disclaimer: string;
}

export const forecastsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getForecasts: build.query<
      { items: ForecastListItem[]; count: number },
      {
        cluster?: RoleCluster;
        targetMetric?: ForecastTargetMetric;
        horizonDays?: number;
      }
    >({
      query: (params) => ({
        url: '/forecasts',
        params,
      }),
      providesTags: ['Forecasts'],
    }),
    getForecast: build.query<ForecastDetail, string>({
      query: (id) => `/forecasts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Forecasts', id }],
    }),
    explainForecast: build.query<ForecastExplain, string>({
      query: (id) => `/forecasts/${id}/explain`,
    }),
  }),
});

export const { useGetForecastsQuery, useGetForecastQuery, useExplainForecastQuery } = forecastsApi;
