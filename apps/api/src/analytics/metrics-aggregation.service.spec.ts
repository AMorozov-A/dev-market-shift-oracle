import { RoleCluster } from '@prisma/client';
import { MetricsAggregationService } from './metrics-aggregation.service';

type RoleBucket = {
  vacancyCount: number;
  classifiedVacancyCount: number;
  employers: Set<string>;
  confidences: number[];
  salaryMidpoints: number[];
  salaryCurrencies: Map<string, number>;
};

function bucket(count: number, employer: string): RoleBucket {
  return {
    vacancyCount: count,
    classifiedVacancyCount: count,
    employers: new Set([employer]),
    confidences: [0.8],
    salaryMidpoints: [],
    salaryCurrencies: new Map(),
  };
}

describe('MetricsAggregationService.densifyMarketClusterDays', () => {
  const service = new MetricsAggregationService(
    {} as ConstructorParameters<typeof MetricsAggregationService>[0],
  );

  it('fills missing calendar days with zero buckets for market clusters', () => {
    const roleMap = new Map<string, RoleBucket>();
    roleMap.set(`2026-08-01|src1|${RoleCluster.FRONTEND}|`, bucket(2, 'A'));
    roleMap.set(`2026-08-03|src1|${RoleCluster.FULLSTACK}|`, bucket(1, 'B'));

    service.densifyMarketClusterDays(roleMap);

    const emptyFrontend = roleMap.get(
      `2026-08-02|src1|${RoleCluster.FRONTEND}|`,
    );
    const emptyBackend = roleMap.get(`2026-08-01|src1|${RoleCluster.BACKEND}|`);
    expect(emptyFrontend?.vacancyCount).toBe(0);
    expect(emptyBackend?.vacancyCount).toBe(0);

    const src1Keys = [...roleMap.keys()].filter((key) =>
      key.includes('|src1|'),
    );
    expect(src1Keys).toHaveLength(24);
  });
});
