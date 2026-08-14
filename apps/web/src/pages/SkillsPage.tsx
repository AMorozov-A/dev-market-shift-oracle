import { useMemo, useState } from 'react';
import { Card, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MarketPeriod } from '@dev-market-oracle/shared-types';
import { RoleCluster } from '@dev-market-oracle/shared-types';
import { useGetSkillsMatrixQuery, useGetSkillsTrendingQuery } from '../features/market/marketApi';
import { PageHeader } from '../shared/ui/PageHeader';
import { MarketFilters } from '../shared/ui/MarketFilters';
import { CaveatsList, InsufficientHistoryAlert, QueryStateGate } from '../shared/ui/QueryStateGate';
import { CLUSTER_LABELS, formatGrowth, formatPercent } from '../shared/lib/labels';

interface TrendingRow {
  roleCluster: RoleCluster;
  skill: { code: string; name: string };
  currentCount: number;
  previousCount: number;
  growthRate: number | null;
  shareWithinCluster: number;
}

interface MatrixSkillRow {
  skill: { code: string; name: string };
  vacancyCount: number;
  shareWithinCluster: number;
}

const TRENDING_COLUMNS: ColumnsType<TrendingRow> = [
  {
    title: 'Сегмент',
    dataIndex: 'roleCluster',
    width: '18%',
    ellipsis: true,
    render: (value: RoleCluster) => CLUSTER_LABELS[value],
  },
  {
    title: 'Навык',
    dataIndex: ['skill', 'name'],
    width: '28%',
    ellipsis: true,
  },
  {
    title: 'Сейчас',
    dataIndex: 'currentCount',
    width: '12%',
    align: 'right',
  },
  {
    title: 'Было',
    dataIndex: 'previousCount',
    width: '12%',
    align: 'right',
  },
  {
    title: 'Δ',
    dataIndex: 'growthRate',
    width: '12%',
    align: 'right',
    render: (value: number | null) => formatGrowth(value),
  },
  {
    title: 'Доля',
    dataIndex: 'shareWithinCluster',
    width: '18%',
    align: 'right',
    render: (value: number) => formatPercent(value),
  },
];

const MATRIX_COLUMNS: ColumnsType<MatrixSkillRow> = [
  {
    title: 'Навык',
    dataIndex: ['skill', 'name'],
    width: '50%',
    ellipsis: true,
  },
  {
    title: 'Вакансии',
    dataIndex: 'vacancyCount',
    width: '25%',
    align: 'right',
  },
  {
    title: 'Доля',
    dataIndex: 'shareWithinCluster',
    width: '25%',
    align: 'right',
    render: (value: number) => formatPercent(value),
  },
];

export function SkillsPage() {
  const [filters, setFilters] = useState<{
    period: MarketPeriod;
    source: string;
    cluster: RoleCluster | 'ALL';
  }>({ period: '30d', source: 'ALL', cluster: 'ALL' });

  const trending = useGetSkillsTrendingQuery({
    period: filters.period,
    cluster: filters.cluster === 'ALL' ? undefined : filters.cluster,
    limit: 30,
  });
  const matrix = useGetSkillsMatrixQuery({
    period: filters.period,
    limitPerCluster: 8,
  });

  const matrixBlocks = useMemo(() => matrix.data?.matrix ?? [], [matrix.data?.matrix]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader
        title="Навыки"
        subtitle="Частота навыков внутри сегментов по доступным описаниям вакансий"
      />
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
      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
        Частота навыка измеряется по доступным описаниям вакансий и словарным совпадениям. Источник
        на этой странице влияет только на соседние market-фильтры; skills-метрики пока агрегированы
        cross-source.
      </Typography.Paragraph>

      <QueryStateGate
        isLoading={trending.isLoading}
        isError={trending.isError}
        isEmpty={!trending.data || trending.data.items.length === 0}
        emptyDescription="Навыки ещё не извлечены — запустите sync и enrichment"
      >
        {trending.data ? (
          <>
            {trending.data.historyStatus === 'INSUFFICIENT_HISTORY' ? (
              <InsufficientHistoryAlert daysWithData={trending.data.dataWindow.daysWithData} />
            ) : null}

            <Card title="Топ навыков">
              <Table<TrendingRow>
                rowKey={(row) => `${row.roleCluster}-${row.skill.code}`}
                dataSource={trending.data.items}
                pagination={{ pageSize: 15 }}
                tableLayout="fixed"
                style={{ width: '100%' }}
                columns={TRENDING_COLUMNS}
              />
            </Card>

            <Card title="Матрица сегмент × навык">
              <Space direction="vertical" style={{ width: '100%' }} size={20}>
                {matrixBlocks.map((block) => (
                  <div key={block.roleCluster} style={{ width: '100%' }}>
                    <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 8 }}>
                      {CLUSTER_LABELS[block.roleCluster]}
                    </Typography.Title>
                    {block.skills.length === 0 ? (
                      <Typography.Text type="secondary">Нет данных</Typography.Text>
                    ) : (
                      <Table<MatrixSkillRow>
                        size="small"
                        pagination={false}
                        rowKey={(row) => row.skill.code}
                        dataSource={block.skills}
                        tableLayout="fixed"
                        style={{ width: '100%' }}
                        columns={MATRIX_COLUMNS}
                      />
                    )}
                  </div>
                ))}
              </Space>
            </Card>

            <CaveatsList items={trending.data.caveats} />
          </>
        ) : null}
      </QueryStateGate>
    </Space>
  );
}
