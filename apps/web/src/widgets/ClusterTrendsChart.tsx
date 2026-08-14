import ReactECharts from 'echarts-for-react';
import type { RoleCluster } from '@dev-market-oracle/shared-types';
import { CLUSTER_LABELS } from '../shared/lib/labels';

interface SeriesPoint {
  date: string;
  roleCluster: RoleCluster;
  value: number;
}

interface ClusterTrendsChartProps {
  series: SeriesPoint[];
  metricLabel: string;
  stacked?: boolean;
}

const COLORS = [
  '#1677ff',
  '#13c2c2',
  '#52c41a',
  '#fa8c16',
  '#eb2f96',
  '#722ed1',
  '#2f54eb',
  '#a0d911',
];

export function ClusterTrendsChart({
  series,
  metricLabel,
  stacked = false,
}: ClusterTrendsChartProps) {
  const dates = [...new Set(series.map((point) => point.date))].sort();
  const clusters = [...new Set(series.map((point) => point.roleCluster))];

  const option = {
    color: COLORS,
    tooltip: { trigger: 'axis' },
    legend: { type: 'scroll', bottom: 0 },
    grid: { left: 48, right: 24, top: 32, bottom: 64 },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value', name: metricLabel },
    series: clusters.map((cluster) => ({
      name: CLUSTER_LABELS[cluster],
      type: 'line',
      smooth: true,
      areaStyle: stacked ? {} : undefined,
      stack: stacked ? 'total' : undefined,
      data: dates.map((date) => {
        const point = series.find((item) => item.date === date && item.roleCluster === cluster);
        return point?.value ?? 0;
      }),
    })),
  };

  return <ReactECharts option={option} style={{ height: 360 }} notMerge />;
}
