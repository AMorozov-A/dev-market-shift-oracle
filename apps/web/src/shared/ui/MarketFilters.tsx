import { Form, Select, Space } from 'antd';
import type { MarketPeriod } from '@dev-market-oracle/shared-types';
import { RoleCluster } from '@dev-market-oracle/shared-types';
import { MARKET_CLUSTERS, CLUSTER_LABELS, PERIOD_OPTIONS, SOURCE_OPTIONS } from '../lib/labels';

export interface MarketFiltersValue {
  period: MarketPeriod;
  source: string;
  cluster?: RoleCluster | 'ALL';
}

interface MarketFiltersProps {
  value: MarketFiltersValue;
  onChange: (next: MarketFiltersValue) => void;
  showCluster?: boolean;
  clusterAllowAll?: boolean;
}

export function MarketFilters({
  value,
  onChange,
  showCluster = false,
  clusterAllowAll = true,
}: MarketFiltersProps) {
  return (
    <Form layout="inline" style={{ rowGap: 12 }}>
      <Form.Item label="Период">
        <Select
          style={{ width: 140 }}
          value={value.period}
          options={PERIOD_OPTIONS}
          onChange={(period: MarketPeriod) => onChange({ ...value, period })}
        />
      </Form.Item>
      <Form.Item label="Источник">
        <Select
          style={{ width: 180 }}
          value={value.source}
          options={[...SOURCE_OPTIONS]}
          onChange={(source: string) => onChange({ ...value, source })}
        />
      </Form.Item>
      {showCluster ? (
        <Form.Item label="Сегмент">
          <Select
            style={{ width: 200 }}
            value={value.cluster ?? 'ALL'}
            options={[
              ...(clusterAllowAll ? [{ value: 'ALL', label: 'Все сегменты' }] : []),
              ...MARKET_CLUSTERS.map((cluster) => ({
                value: cluster,
                label: CLUSTER_LABELS[cluster],
              })),
            ]}
            onChange={(cluster: RoleCluster | 'ALL') => onChange({ ...value, cluster })}
          />
        </Form.Item>
      ) : null}
      <Space />
    </Form>
  );
}
