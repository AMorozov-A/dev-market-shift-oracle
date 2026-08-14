import { useMemo, useState } from 'react';
import { Alert, Button, Card, Space, Typography, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import type { MarketPeriod } from '@dev-market-oracle/shared-types';
import { useGetOverviewQuery, useGetTrendsQuery } from '../features/market/marketApi';
import { useStartSyncMutation } from '../features/sync/syncApi';
import { useSyncWatcher } from '../features/sync/useSyncWatcher';
import { PageHeader } from '../shared/ui/PageHeader';
import { MarketFilters } from '../shared/ui/MarketFilters';
import { CaveatsList, InsufficientHistoryAlert, QueryStateGate } from '../shared/ui/QueryStateGate';
import { ClusterKpiGrid } from '../widgets/ClusterKpiGrid';
import { ClusterTrendsChart } from '../widgets/ClusterTrendsChart';
import { formatDateTime } from '../shared/lib/labels';
import { CLUSTER_LABELS } from '../shared/lib/labels';

export function OverviewPage() {
  const [filters, setFilters] = useState<{
    period: MarketPeriod;
    source: string;
  }>({ period: '30d', source: 'ALL' });

  const overviewQuery = useGetOverviewQuery(filters);
  const trendsQuery = useGetTrendsQuery({
    ...filters,
    metric: 'vacancyCount',
  });
  const { latest: latestSync, isBusy: isSyncBusy, watchStarted } = useSyncWatcher(1);
  const [startSync, startSyncState] = useStartSyncMutation();

  const observationRu = useMemo(() => {
    const observation = overviewQuery.data?.keyObservation;
    if (!observation) {
      return null;
    }
    const cluster =
      observation.roleCluster !== null ? CLUSTER_LABELS[observation.roleCluster] : null;
    return {
      ...observation,
      clusterLabel: cluster,
    };
  }, [overviewQuery.data?.keyObservation]);

  const onRefresh = async () => {
    try {
      const sourceCodes = filters.source === 'ALL' ? ['REMOTEOK', 'JOBICY'] : [filters.source];
      const result = await startSync({ sourceCodes }).unwrap();
      watchStarted(result.id);
      message.success(`Синхронизация запущена (${result.id.slice(0, 8)}…)`);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      message.error(err.data?.message ?? err.message ?? 'Не удалось запустить sync');
    }
  };

  const errorMessage = (overviewQuery.error as { data?: { message?: string } } | undefined)?.data
    ?.message;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader
        title="Dev Market Shift Oracle"
        subtitle="Как меняется спрос на frontend, fullstack и AI-related роли"
        extra={
          <Button
            type="primary"
            icon={<SyncOutlined spin={startSyncState.isLoading || isSyncBusy} />}
            loading={startSyncState.isLoading || isSyncBusy}
            onClick={() => void onRefresh()}
          >
            Обновить данные
          </Button>
        }
      />

      <MarketFilters value={filters} onChange={setFilters} />

      <Card size="small">
        <Space wrap>
          <Typography.Text>
            Последний sync:{' '}
            <Typography.Text strong>
              {latestSync ? latestSync.status : 'нет запусков'}
            </Typography.Text>
          </Typography.Text>
          <Typography.Text type="secondary">
            Запрошен: {formatDateTime(latestSync?.requestedAt ?? latestSync?.queuedAt)}
          </Typography.Text>
          <Typography.Text type="secondary">
            Обновление вакансий: {formatDateTime(overviewQuery.data?.lastUpdatedAt)}
          </Typography.Text>
        </Space>
      </Card>

      <QueryStateGate
        isLoading={overviewQuery.isLoading}
        isError={overviewQuery.isError}
        errorMessage={errorMessage}
        isEmpty={!overviewQuery.data}
      >
        {overviewQuery.data ? (
          <>
            {overviewQuery.data.coverage.historyStatus === 'INSUFFICIENT_HISTORY' ? (
              <InsufficientHistoryAlert
                daysWithData={overviewQuery.data.dataWindow.daysWithData}
                daysNeeded={overviewQuery.data.coverage.daysNeededForForecast}
              />
            ) : null}

            <ClusterKpiGrid rows={overviewQuery.data.roleClusters} />

            <Card title="Главное наблюдение">
              <Typography.Paragraph style={{ marginBottom: 8 }}>
                {observationRu?.message}
              </Typography.Paragraph>
              {observationRu?.clusterLabel ? (
                <Typography.Text type="secondary">
                  Сегмент: {observationRu.clusterLabel}
                </Typography.Text>
              ) : null}
            </Card>

            <Card title="Динамика числа вакансий">
              {trendsQuery.isFetching && !trendsQuery.data ? (
                <Typography.Text type="secondary">Загрузка графика…</Typography.Text>
              ) : trendsQuery.data && trendsQuery.data.series.length > 0 ? (
                <ClusterTrendsChart series={trendsQuery.data.series} metricLabel="Вакансии" />
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="Недостаточно точек для графика"
                  description="Нужна история по дням публикации вакансий."
                />
              )}
            </Card>

            <CaveatsList items={overviewQuery.data.caveats} />
          </>
        ) : null}
      </QueryStateGate>
    </Space>
  );
}
