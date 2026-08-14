import { useMemo, useState } from 'react';
import { Alert, Card, Col, Descriptions, Row, Select, Space, Tag, Typography } from 'antd';
import ReactECharts from 'echarts-for-react';
import {
  ForecastDirection,
  ForecastStatus,
  ForecastTargetMetric,
  RoleCluster,
} from '@dev-market-oracle/shared-types';
import {
  useExplainForecastQuery,
  useGetForecastQuery,
  useGetForecastsQuery,
} from '../features/forecasts/forecastsApi';
import { PageHeader } from '../shared/ui/PageHeader';
import { CaveatsList, InsufficientHistoryAlert, QueryStateGate } from '../shared/ui/QueryStateGate';
import {
  CLUSTER_LABELS,
  DIRECTION_LABELS,
  FORECAST_STATUS_LABELS,
  MARKET_CLUSTERS,
  TARGET_METRIC_LABELS,
  formatPercent,
} from '../shared/lib/labels';

const RISK_LABELS: Record<string, { title: string; detail: string }> = {
  insufficient_history: {
    title: 'Мало истории',
    detail: 'Слишком короткий ряд дней для устойчивого прогноза.',
  },
  high_backtest_error: {
    title: 'Высокая ошибка на проверке',
    detail: 'Модель плохо попала в недавние фактические значения (backtest).',
  },
  high_volatility: {
    title: 'Высокая волатильность',
    detail: 'Дневные значения сильно скачут — тренд менее надёжен.',
  },
  short_history: {
    title: 'Короткое окно данных',
    detail: 'История есть, но она всё ещё короче желаемого запаса.',
  },
  small_sample: {
    title: 'Малая выборка',
    detail: 'В сегменте мало вакансий — выводы предварительные.',
  },
};

const MODEL_LABELS: Record<string, string> = {
  rolling_average: 'Скользящее среднее',
  linear_trend: 'Линейный тренд',
  none: 'Модель не выбрана',
};

function forecastAxisRange(predicted: number[]): { min: number; max: number } {
  const finite = predicted.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return { min: 0, max: 1 };
  }

  const predMin = Math.min(...finite);
  const predMax = Math.max(...finite);
  const mid = (predMin + predMax) / 2;
  const span = predMax - predMin;
  const pad = Math.max(span * 0.45, Math.abs(mid) * 0.12, 0.04);
  let min = predMin - pad;
  let max = predMax + pad;

  if (predMin >= 0 && min < 0) {
    min = 0;
    max = Math.max(max, pad);
  }

  if (max - min < 1e-6) {
    max = min + 0.08;
  }

  return { min, max };
}

function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  if (!month || !day) {
    return isoDate;
  }
  return `${day}.${month}`;
}

function parseRiskKey(raw: string): { key: string; extra?: string } {
  const eq = raw.indexOf('=');
  if (eq === -1) {
    return { key: raw };
  }
  return { key: raw.slice(0, eq), extra: raw.slice(eq + 1) };
}

function isDriversRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatPredictedValue(value: number, metric: ForecastTargetMetric): string {
  if (metric === ForecastTargetMetric.MARKET_SHARE) {
    return formatPercent(value);
  }
  return value.toFixed(2);
}

function metricUnitLabel(metric: ForecastTargetMetric): string {
  return metric === ForecastTargetMetric.MARKET_SHARE
    ? 'доля рынка (0–100%)'
    : 'среднее число вакансий в день (по дате публикации в выборке)';
}

function directionExplanation(
  direction: ForecastDirection,
  lastActual: number | null,
  predicted: number,
  metric: ForecastTargetMetric,
): string {
  const lastLabel =
    lastActual === null ? 'последнему факту' : formatPredictedValue(lastActual, metric);
  const predictedLabel = formatPredictedValue(predicted, metric);
  const threshold = '5%';

  if (direction === ForecastDirection.STABLE) {
    return `Направление «Стабилизация»: прогноз (${predictedLabel}) почти не отличается от последнего факта (${lastLabel}) — изменение меньше ${threshold}.`;
  }
  if (direction === ForecastDirection.UP) {
    return `Направление «Рост»: прогноз на горизонт (${predictedLabel}) выше последнего факта (${lastLabel}) больше чем на ${threshold}.`;
  }
  return `Направление «Снижение»: прогноз на горизонт (${predictedLabel}) ниже последнего факта (${lastLabel}) больше чем на ${threshold}.`;
}

function modelExplanation(modelName: string): string {
  if (modelName === 'rolling_average') {
    return 'Выбрано скользящее среднее: оно лучше прошло проверку на недавней истории (меньшая ошибка MAE), чем линейный тренд. Модель продолжает недавний средний уровень, без сильного наклона.';
  }
  if (modelName === 'linear_trend') {
    return 'Выбран линейный тренд: на backtest он ошибся меньше, чем скользящее среднее. Модель продолжает наклон последних дневных значений вперёд.';
  }
  return 'Модель не выбрана — обычно при недостаточной истории.';
}

export function ForecastPage() {
  const [cluster, setCluster] = useState<RoleCluster>(RoleCluster.FRONTEND);
  const [targetMetric, setTargetMetric] = useState<ForecastTargetMetric>(
    ForecastTargetMetric.VACANCY_COUNT,
  );
  const [horizonDays, setHorizonDays] = useState<number>(30);

  const listQuery = useGetForecastsQuery({
    cluster,
    targetMetric,
    horizonDays,
  });

  const selected = listQuery.data?.items[0];
  const detailQuery = useGetForecastQuery(selected?.id ?? '', {
    skip: !selected?.id,
  });
  const explainQuery = useExplainForecastQuery(selected?.id ?? '', {
    skip: !selected?.id,
  });

  const segmentCards = useGetForecastsQuery({
    targetMetric,
    horizonDays,
  });

  const chartOption = useMemo(() => {
    const points = detailQuery.data?.points ?? [];
    if (points.length === 0) {
      return null;
    }

    const labels = points.map((point) => shortDate(point.forecastDate));
    const predicted = points.map((point) => Number(point.predictedValue.toFixed(4)));
    const lower = points.map((point) =>
      point.lowerBound === null ? null : Number(point.lowerBound.toFixed(4)),
    );
    const upper = points.map((point) =>
      point.upperBound === null ? null : Number(point.upperBound.toFixed(4)),
    );
    const band = upper.map((hi, index) => {
      const lo = lower[index];
      if (hi === null || lo === null) {
        return null;
      }
      return Number((hi - lo).toFixed(4));
    });

    const labelStep = Math.max(1, Math.ceil(points.length / 8));
    const axis = forecastAxisRange(predicted);
    const ySpan = axis.max - axis.min;
    const yDigits = ySpan < 1 ? 2 : ySpan < 10 ? 1 : 0;

    return {
      color: ['#1d4e89', '#94a3b8'],
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: number | null) =>
          value === null || Number.isNaN(value) ? '—' : value.toFixed(3),
      },
      legend: {
        data: ['Прогноз', 'Диапазон'],
        bottom: 0,
      },
      grid: { left: 52, right: 20, top: 28, bottom: 56 },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLabel: {
          interval: (index: number) =>
            index === 0 || index === labels.length - 1 || index % labelStep === 0,
          hideOverlap: true,
          fontSize: 11,
          color: '#64748b',
        },
        axisTick: { alignWithLabel: true },
      },
      yAxis: {
        type: 'value',
        min: axis.min,
        max: axis.max,
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLabel: {
          fontSize: 11,
          color: '#64748b',
          formatter: (value: number) => value.toFixed(yDigits),
        },
      },
      series: [
        {
          name: 'Диапазон',
          type: 'line',
          data: lower,
          lineStyle: { opacity: 0 },
          stack: 'band',
          symbol: 'none',
          tooltip: { show: false },
        },
        {
          name: 'Диапазон',
          type: 'line',
          data: band,
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(29, 78, 137, 0.12)' },
          stack: 'band',
          symbol: 'none',
        },
        {
          name: 'Прогноз',
          type: 'line',
          data: predicted,
          smooth: true,
          showSymbol: points.length <= 14,
          symbolSize: 6,
          lineStyle: { width: 2.5 },
        },
      ],
    };
  }, [detailQuery.data?.points]);

  const riskList = Array.isArray(selected?.riskFactors) ? (selected.riskFactors as string[]) : [];

  const drivers = isDriversRecord(explainQuery.data?.drivers) ? explainQuery.data.drivers : null;

  const forecastByCluster = useMemo(() => {
    const map = new Map((segmentCards.data?.items ?? []).map((item) => [item.roleCluster, item]));
    return map;
  }, [segmentCards.data?.items]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <PageHeader
        title="Прогноз"
        subtitle="Куда может сдвинуться спрос по сегменту в нашей выборке RemoteOK + Jobicy"
      />

      <Alert
        type="info"
        showIcon
        message="Что именно прогнозируется"
        description={
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              Объект прогноза — один из 8 сегментов ролей (Frontend, Fullstack, …), не отдельная
              компания и не весь рынок труда.
            </li>
            <li>
              Метрика «Число вакансий» — сколько вакансий сегмента с датой публикации в конкретный
              день (в нашей выборке). Дни без вакансий = 0.
            </li>
            <li>Метрика «Доля рынка» — доля сегмента среди classified-вакансий в тот же день.</li>
            <li>
              Горизонт — ожидаемое значение через {horizonDays} дней вперёд + направление
              относительно последнего факта.
            </li>
          </ul>
        }
      />

      <Space wrap>
        <Select
          style={{ width: 200 }}
          value={cluster}
          options={MARKET_CLUSTERS.map((item) => ({
            value: item,
            label: CLUSTER_LABELS[item],
          }))}
          onChange={setCluster}
        />
        <Select
          style={{ width: 200 }}
          value={targetMetric}
          options={Object.values(ForecastTargetMetric).map((item) => ({
            value: item,
            label: TARGET_METRIC_LABELS[item],
          }))}
          onChange={setTargetMetric}
        />
        <Select
          style={{ width: 140 }}
          value={horizonDays}
          options={[
            { value: 30, label: '30 дней' },
            { value: 90, label: '90 дней' },
          ]}
          onChange={setHorizonDays}
        />
      </Space>

      <Card title="Сегменты">
        <Row gutter={[12, 12]}>
          {MARKET_CLUSTERS.map((item) => {
            const forecast = forecastByCluster.get(item);
            const selectedCard = item === cluster;
            return (
              <Col xs={24} sm={12} md={8} lg={6} key={item}>
                <button
                  type="button"
                  onClick={() => setCluster(item)}
                  style={{
                    width: '100%',
                    height: 112,
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderRadius: 8,
                    border: selectedCard ? '2px solid #1d4e89' : '1px solid #d9e2ec',
                    background: selectedCard ? '#f0f5fa' : '#fff',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: selectedCard ? '0 0 0 1px rgba(29, 78, 137, 0.08)' : 'none',
                  }}
                >
                  <Typography.Text strong style={{ fontSize: 15 }}>
                    {CLUSTER_LABELS[item]}
                  </Typography.Text>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {forecast ? (
                      <>
                        <Tag
                          style={{ marginInlineEnd: 0 }}
                          color={forecast.status === ForecastStatus.READY ? 'blue' : 'default'}
                        >
                          {FORECAST_STATUS_LABELS[forecast.status]}
                        </Tag>
                        {forecast.status === ForecastStatus.READY ? (
                          <Tag
                            style={{ marginInlineEnd: 0 }}
                            color={
                              forecast.direction === ForecastDirection.UP
                                ? 'green'
                                : forecast.direction === ForecastDirection.DOWN
                                  ? 'red'
                                  : 'default'
                            }
                          >
                            {DIRECTION_LABELS[forecast.direction]}
                          </Tag>
                        ) : null}
                      </>
                    ) : (
                      <Typography.Text type="secondary">Нет данных</Typography.Text>
                    )}
                  </div>
                </button>
              </Col>
            );
          })}
        </Row>
      </Card>

      <QueryStateGate
        isLoading={listQuery.isLoading}
        isError={listQuery.isError}
        isEmpty={!selected}
        emptyDescription="Прогноз для выбранных параметров ещё не сгенерирован"
      >
        {selected ? (
          <>
            {selected.status === ForecastStatus.INSUFFICIENT_HISTORY ? (
              <InsufficientHistoryAlert daysWithData={selected.sampleSize} />
            ) : null}

            {(() => {
              const lastActual =
                typeof drivers?.lastActual === 'number' ? drivers.lastActual : null;
              const predicted =
                typeof drivers?.predictedHorizonValue === 'number'
                  ? drivers.predictedHorizonValue
                  : selected.predictedValue;
              const metricLabel = TARGET_METRIC_LABELS[selected.targetMetric];

              return (
                <>
                  <Alert
                    type="success"
                    showIcon
                    message={`Сейчас смотрим: ${CLUSTER_LABELS[selected.roleCluster]} · ${metricLabel} · ${selected.horizonDays} дн.`}
                    description={
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Typography.Text>
                          <Typography.Text strong>Значение прогноза </Typography.Text>(
                          {formatPredictedValue(predicted, selected.targetMetric)}) — это ожидаемый
                          уровень метрики «{metricUnitLabel(selected.targetMetric)}» через{' '}
                          {selected.horizonDays} дней. Это не проценты уверенности и не вероятность
                          события.
                        </Typography.Text>
                        <Typography.Text>
                          <Typography.Text strong>Уверенность </Typography.Text>(
                          {formatPercent(selected.confidence)}) — насколько модель считает результат
                          устойчивым (длина истории, ошибка backtest, волатильность). Низкая
                          уверенность = смотреть осторожно.
                        </Typography.Text>
                        <Typography.Text>
                          {directionExplanation(
                            selected.direction,
                            lastActual,
                            predicted,
                            selected.targetMetric,
                          )}
                        </Typography.Text>
                        <Typography.Text>{modelExplanation(selected.modelName)}</Typography.Text>
                      </Space>
                    }
                  />

                  <Row gutter={[12, 12]}>
                    {[
                      {
                        label: 'Статус',
                        value: FORECAST_STATUS_LABELS[selected.status],
                        hint: 'Готов = ряд достаточно длинный для расчёта',
                      },
                      {
                        label: 'Направление',
                        value: DIRECTION_LABELS[selected.direction],
                        hint: 'Сравнение прогноза с последним фактом (±5%)',
                      },
                      {
                        label: 'Прогноз (горизонт)',
                        value:
                          selected.status === ForecastStatus.READY
                            ? formatPredictedValue(predicted, selected.targetMetric)
                            : '—',
                        hint:
                          selected.targetMetric === ForecastTargetMetric.MARKET_SHARE
                            ? 'Ожидаемая доля сегмента'
                            : typeof drivers?.lastActual === 'number' &&
                                drivers.lastActual === 0 &&
                                predicted < 0.2
                              ? 'В выборке почти нет вакансий сегмента — прогноз около нуля'
                              : 'Ожидаемые вакансии/день в выборке',
                      },
                      {
                        label: 'Уверенность',
                        value: formatPercent(selected.confidence),
                        hint: 'Не вероятность, а оценка устойчивости модели',
                      },
                      {
                        label: 'Модель',
                        value: MODEL_LABELS[selected.modelName] ?? selected.modelName,
                        hint: 'Выбрана по меньшей ошибке MAE на backtest',
                      },
                      {
                        label: 'Окно / дни',
                        value: `${selected.trainStartDate} → ${selected.trainEndDate} · ${selected.sampleSize} дн.`,
                        hint: 'На каких днях публикаций учили модель',
                      },
                    ].map((item) => (
                      <Col xs={24} sm={12} md={8} key={item.label}>
                        <Card size="small" styles={{ body: { minHeight: 108 } }}>
                          <Typography.Text type="secondary">{item.label}</Typography.Text>
                          <Typography.Title
                            level={4}
                            style={{
                              margin: '6px 0 8px',
                              fontSize: 18,
                              lineHeight: 1.35,
                            }}
                          >
                            {item.value}
                          </Typography.Title>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {item.hint}
                          </Typography.Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>

                  <Card title={`График прогноза · ${CLUSTER_LABELS[selected.roleCluster]}`}>
                    <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                      Линия — прогноз дневного значения на {selected.horizonDays} дней вперёд. Шкала
                      оси Y подобрана по линии, чтобы был виден наклон даже при небольшой разнице.
                      Заливка — диапазон неопределённости; он может быть шире видимой области. Ось
                      Y: {metricUnitLabel(selected.targetMetric)}.
                    </Typography.Paragraph>
                    {selected.status !== ForecastStatus.READY || !chartOption ? (
                      <Typography.Text type="secondary">
                        График не строится при недостаточной истории или без точек.
                      </Typography.Text>
                    ) : (
                      <ReactECharts
                        option={chartOption}
                        style={{ height: 360, width: '100%' }}
                        notMerge
                      />
                    )}
                  </Card>

                  <Card title="Риски">
                    {riskList.length === 0 ? (
                      <Typography.Text type="secondary">Явных рисков нет</Typography.Text>
                    ) : (
                      <Row gutter={[12, 12]}>
                        {riskList.map((raw) => {
                          const { key, extra } = parseRiskKey(raw);
                          const known = RISK_LABELS[key];
                          return (
                            <Col xs={24} md={12} key={raw}>
                              <Alert
                                type="warning"
                                showIcon
                                style={{ height: '100%' }}
                                message={known?.title ?? key}
                                description={
                                  known ? `${known.detail}${extra ? ` (${extra})` : ''}` : raw
                                }
                              />
                            </Col>
                          );
                        })}
                      </Row>
                    )}
                  </Card>

                  <Card title="Почему такой результат">
                    <Typography.Paragraph type="secondary">
                      {explainQuery.data?.disclaimer ??
                        'Прогноз описывает изменение в доступной выборке вакансий, а не рынок целиком.'}
                    </Typography.Paragraph>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={14}>
                        <Descriptions column={1} size="small" styles={{ label: { width: 200 } }}>
                          <Descriptions.Item label="Что прогнозируем">
                            {metricLabel} сегмента {CLUSTER_LABELS[selected.roleCluster]} через{' '}
                            {selected.horizonDays} дн.
                          </Descriptions.Item>
                          <Descriptions.Item label="Как выбираем модель">
                            Считаем прогноз двумя способами (скользящее среднее и линейный тренд) на
                            хвосте истории и берём тот, у кого меньше MAE.
                          </Descriptions.Item>
                          <Descriptions.Item label="Почему эта модель">
                            {modelExplanation(selected.modelName)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Последний факт">
                            {lastActual === null
                              ? '—'
                              : formatPredictedValue(lastActual, selected.targetMetric)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Прогноз на горизонт">
                            {formatPredictedValue(predicted, selected.targetMetric)}
                          </Descriptions.Item>
                          <Descriptions.Item label="Почему направление">
                            {directionExplanation(
                              selected.direction,
                              lastActual,
                              predicted,
                              selected.targetMetric,
                            )}
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                      <Col xs={24} lg={10}>
                        {detailQuery.data?.backtest ? (
                          <Alert
                            type="info"
                            showIcon
                            style={{ height: '100%' }}
                            message="Проверка на истории (backtest)"
                            description={
                              <Space direction="vertical" size={6}>
                                <span>
                                  Мы «спрятали» последние {detailQuery.data.backtest.sampleSize}{' '}
                                  дн., построили прогноз и сравнили с фактом.
                                </span>
                                <span>
                                  MAE (средняя абсолютная ошибка):{' '}
                                  {detailQuery.data.backtest.mae?.toFixed(3) ?? 'н/д'}
                                </span>
                                <span>
                                  MAPE (средняя относительная ошибка):{' '}
                                  {detailQuery.data.backtest.mape === null
                                    ? 'н/д (если факты ≈ 0)'
                                    : formatPercent(detailQuery.data.backtest.mape)}
                                </span>
                                <span>
                                  Чем меньше MAE/MAPE, тем лучше модель попадала в недавние дни.
                                </span>
                              </Space>
                            }
                          />
                        ) : (
                          <Typography.Text type="secondary">
                            Backtest недоступен при недостаточной истории.
                          </Typography.Text>
                        )}
                      </Col>
                    </Row>
                  </Card>

                  <CaveatsList
                    items={[
                      'Прогноз не является утверждением о будущем всей профессии.',
                      'Источник: RemoteOK + Jobicy (remote/global bias).',
                      'Число вроде 0.35 для «числа вакансий» — это ожидаемый дневной уровень в выборке (часто дробный из‑за среднего/тренда), а не «35% рынка».',
                    ]}
                  />
                </>
              );
            })()}
          </>
        ) : null}
      </QueryStateGate>
    </Space>
  );
}
