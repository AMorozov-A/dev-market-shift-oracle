import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import { RoleCluster } from '@dev-market-oracle/shared-types';
import type { OverviewClusterDto } from '../features/market/marketApi';
import { CLUSTER_LABELS, formatGrowth, formatPercent } from '../shared/lib/labels';

interface ClusterKpiGridProps {
  rows: OverviewClusterDto[];
}

export function ClusterKpiGrid({ rows }: ClusterKpiGridProps) {
  return (
    <Row gutter={[16, 16]}>
      {rows.map((row) => (
        <Col xs={24} sm={12} lg={8} xl={6} key={row.roleCluster}>
          <Card size="small" styles={{ body: { padding: 16 } }}>
            <Typography.Text strong>
              {CLUSTER_LABELS[row.roleCluster as RoleCluster]}
            </Typography.Text>
            <Statistic
              value={row.vacancyCount}
              suffix="вакансий"
              valueStyle={{ fontSize: 28, marginTop: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Tag>Доля {formatPercent(row.marketShare)}</Tag>
              <Tag color={row.growthRate >= 0 ? 'green' : 'red'}>
                Δ {formatGrowth(row.growthRate)}
              </Tag>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
