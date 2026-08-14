import { Alert, Empty, Result, Spin } from 'antd';
import type { ReactNode } from 'react';

interface QueryStateGateProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyDescription?: string;
  children: ReactNode;
}

export function QueryStateGate({
  isLoading,
  isError,
  errorMessage,
  isEmpty,
  emptyDescription,
  children,
}: QueryStateGateProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <Result
        status="error"
        title="Не удалось загрузить данные"
        subTitle={errorMessage ?? 'Проверьте, что API запущен и доступен через /api/v1.'}
      />
    );
  }

  if (isEmpty) {
    return <Empty description={emptyDescription ?? 'Нет данных для отображения'} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
}

export function InsufficientHistoryAlert({
  daysWithData,
  daysNeeded,
}: {
  daysWithData: number;
  daysNeeded?: number;
}) {
  return (
    <Alert
      type="warning"
      showIcon
      message="Недостаточно истории"
      description={
        daysNeeded && daysNeeded > 0
          ? `Собрано ${daysWithData} дн. данных. Для устойчивого прогноза нужно ещё около ${daysNeeded} дн.`
          : `Собрано ${daysWithData} дн. данных. Прогноз и тренды могут быть предварительными.`
      }
    />
  );
}

export function CaveatsList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <Alert
      type="info"
      showIcon
      message="Ограничения данных"
      description={
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      }
    />
  );
}
