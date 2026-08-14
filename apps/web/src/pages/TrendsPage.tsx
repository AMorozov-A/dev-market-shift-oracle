import { useState } from 'react';
import { Card, Space, Table, Typography } from 'antd';
import type { MarketPeriod } from '@dev-market-oracle/shared-types';
import { RoleCluster } from '@dev-market-oracle/shared-types';
import { useGetCompareQuery, useGetTrendsQuery } from '../features/market/marketApi';
import { PageHeader } from '../shared/ui/PageHeader';
import { MarketFilters } from '../shared/ui/MarketFilters';
import { CaveatsList, InsufficientHistoryAlert, QueryStateGate } from '../shared/ui/QueryStateGate';
import { ClusterTrendsChart } from '../widgets/ClusterTrendsChart';
import { CLUSTER_LABELS, formatGrowth, formatPercent, MARKET_CLUSTERS } from '../shared/lib/labels';

export function TrendsPage() {
  const [filters, setFilters] = useState<{
    period: MarketPeriod;
    source: string;
    cluster: RoleCluster | 'ALL';
  }>({ period: '30d', source: 'ALL', cluster: 'ALL' });

  const clusters = filters.cluster === 'ALL' ? undefined : [filters.cluster];

  const vacancyTrends = useGetTrendsQuery({
    period: filters.period,
    source: filters.source,
    metric: 'vacancyCount',
    clusters,
  });
  const shareTrends = useGetTrendsQuery({
    period: filters.period,
    source: filters.source,
    metric: 'marketShare',
    clusters,
  });
  const salaryTrends = useGetTrendsQuery({
    period: filters.period,
    source: filters.source,
    metric: 'medianSalary',
    clusters,
  });
  const compare = useGetCompareQuery({
    period: filters.period,
    source: filters.source,
    metric: 'vacancyCount',
  });

  const loading = vacancyTrends.isLoading || shareTrends.isLoading || compare.isLoading;
  const error = vacancyTrends.isError || compare.isError;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader title="Тренды" subtitle="Динамика вакансий, доли рынка и зарплат по сегментам" />
      <MarketFilters
        value={filters}
        onChange={(next) =>
          setFilters({
            period: next.period,
            source: next.source,
            cluster: next.cluster ?? 'ALL',
          })
        }
        showCluster
      />

      <QueryStateGate isLoading={loading} isError={error} isEmpty={!vacancyTrends.data}>
        {vacancyTrends.data ? (
          <>
            {vacancyTrends.data.historyStatus === 'INSUFFICIENT_HISTORY' ? (
              <InsufficientHistoryAlert daysWithData={vacancyTrends.data.dataWindow.daysWithData} />
            ) : null}

            <Card title="Число вакансий">
              {vacancyTrends.data.series.length > 0 ? (
                <ClusterTrendsChart series={vacancyTrends.data.series} metricLabel="Вакансии" />
              ) : (
                <Typography.Text type="secondary">Нет точек ряда</Typography.Text>
              )}
            </Card>

            <Card title="Доля рынка (stacked)">
              {shareTrends.data && shareTrends.data.series.length > 0 ? (
                <ClusterTrendsChart series={shareTrends.data.series} metricLabel="Доля" stacked />
              ) : (
                <Typography.Text type="secondary">Нет точек ряда</Typography.Text>
              )}
            </Card>

            <Card title="Медианная зарплата (midpoint)">
              {salaryTrends.data && salaryTrends.data.series.some((p) => p.value > 0) ? (
                <ClusterTrendsChart series={salaryTrends.data.series} metricLabel="Зарплата" />
              ) : (
                <Typography.Text type="secondary">
                  Зарплатное покрытие низкое или отсутствует — график скрыт.
                </Typography.Text>
              )}
            </Card>

            <Card title="Таблица по сегментам">
              <Table
                rowKey="roleCluster"
                pagination={false}
                dataSource={(compare.data?.rows ?? []).filter((row) =>
                  MARKET_CLUSTERS.includes(row.roleCluster),
                )}
                columns={[
                  {
                    title: 'Сегмент',
                    dataIndex: 'roleCluster',
                    render: (value: RoleCluster) => CLUSTER_LABELS[value],
                  },
                  { title: 'Сейчас', dataIndex: 'current' },
                  { title: 'Было', dataIndex: 'previousVacancyCount' },
                  {
                    title: 'Δ',
                    dataIndex: 'growthRate',
                    render: (value: number) => formatGrowth(value),
                  },
                  {
                    title: 'Доля',
                    dataIndex: 'marketShare',
                    render: (value: number) => formatPercent(value),
                  },
                  { title: 'Выборка', dataIndex: 'sampleSize' },
                ]}
              />
            </Card>

            <CaveatsList items={vacancyTrends.data.caveats} />
          </>
        ) : null}
      </QueryStateGate>
    </Space>
  );
}
