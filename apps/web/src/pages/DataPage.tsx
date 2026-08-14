import { Button, Card, Space, Table, Tag, Typography, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { SyncStatus } from '@dev-market-oracle/shared-types';
import { useStartSyncMutation } from '../features/sync/syncApi';
import { useSyncWatcher } from '../features/sync/useSyncWatcher';
import { PageHeader } from '../shared/ui/PageHeader';
import { QueryStateGate } from '../shared/ui/QueryStateGate';
import { SYNC_STATUS_LABELS, formatDateTime } from '../shared/lib/labels';

export function DataPage() {
  const { listQuery, watchId, isBusy, activeRun, watchStarted } = useSyncWatcher(20);
  const [startSync, startState] = useStartSyncMutation();

  const onStart = async () => {
    try {
      const result = await startSync({
        sourceCodes: ['REMOTEOK', 'JOBICY'],
      }).unwrap();
      watchStarted(result.id);
      message.success('Синхронизация запущена');
    } catch (error: unknown) {
      const err = error as { data?: { message?: string }; message?: string };
      message.error(err.data?.message ?? err.message ?? 'Ошибка запуска sync');
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader
        title="Данные и синхронизация"
        subtitle="История sync runs, статусы и счётчики без гигантского raw JSON"
        extra={
          <Button
            type="primary"
            icon={<SyncOutlined spin={startState.isLoading || isBusy} />}
            loading={startState.isLoading || isBusy}
            onClick={() => void onStart()}
          >
            Запустить sync
          </Button>
        }
      />

      {watchId && activeRun ? (
        <Card title="Активный sync">
          <Space direction="vertical">
            <Typography.Text>
              ID: <Typography.Text code>{activeRun.id}</Typography.Text>
            </Typography.Text>
            <Tag>{SYNC_STATUS_LABELS[activeRun.status]}</Tag>
            <Typography.Text>
              Профили: {activeRun.processedProfiles ?? 0}/{activeRun.totalProfiles}
            </Typography.Text>
            <Typography.Text>
              Найдено: {activeRun.foundVacancies ?? 0}, деталей: {activeRun.fetchedDetails ?? 0},
              нормализовано: {activeRun.normalizedVacancies ?? 0}, ошибок:{' '}
              {activeRun.failedRequests ?? 0}
            </Typography.Text>
            {activeRun.errorSummary ? (
              <Typography.Paragraph type="danger">{activeRun.errorSummary}</Typography.Paragraph>
            ) : null}
          </Space>
        </Card>
      ) : null}

      <QueryStateGate
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        isEmpty={!listQuery.data || listQuery.data.items.length === 0}
        emptyDescription="Пока нет sync runs — запустите синхронизацию"
      >
        <Card title="История запусков">
          <Table
            rowKey="id"
            dataSource={listQuery.data?.items}
            pagination={false}
            columns={[
              {
                title: 'Статус',
                dataIndex: 'status',
                render: (value: SyncStatus) => (
                  <Tag
                    color={
                      value === SyncStatus.FAILED
                        ? 'red'
                        : value === SyncStatus.COMPLETED
                          ? 'green'
                          : 'blue'
                    }
                  >
                    {SYNC_STATUS_LABELS[value]}
                  </Tag>
                ),
              },
              {
                title: 'Запрошен',
                dataIndex: 'requestedAt',
                render: formatDateTime,
              },
              {
                title: 'Старт',
                dataIndex: 'startedAt',
                render: formatDateTime,
              },
              {
                title: 'Финиш',
                dataIndex: 'finishedAt',
                render: formatDateTime,
              },
              { title: 'Профили', dataIndex: 'processedProfiles' },
              { title: 'Найдено', dataIndex: 'foundVacancies' },
              { title: 'Норм.', dataIndex: 'normalizedVacancies' },
              { title: 'Ошибки', dataIndex: 'failedRequests' },
              {
                title: 'Metadata',
                dataIndex: 'metadata',
                render: (value: Record<string, unknown> | null) => {
                  if (!value) {
                    return '—';
                  }
                  const sources = Array.isArray(value.sourceCodes)
                    ? value.sourceCodes.join(', ')
                    : '—';
                  return <Typography.Text type="secondary">{sources}</Typography.Text>;
                },
              },
            ]}
          />
        </Card>
      </QueryStateGate>
    </Space>
  );
}
