import { Typography } from 'antd';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  extra?: ReactNode;
}

export function PageHeader({ title, subtitle, extra }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        marginBottom: 16,
      }}
    >
      <div>
        <Typography.Title level={2} style={{ marginBottom: 4 }}>
          {title}
        </Typography.Title>
        {subtitle ? (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {subtitle}
          </Typography.Paragraph>
        ) : null}
      </div>
      {extra}
    </div>
  );
}
