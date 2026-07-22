'use client';

import { Alert, Typography, Tag } from 'antd';
import type { GzhValidationResult } from '@/types/gzh';

const { Text } = Typography;

interface GzhValidationReportProps {
  validation: GzhValidationResult | null;
}

export default function GzhValidationReport({ validation }: GzhValidationReportProps) {
  if (!validation) return null;

  const { errors, warnings, spanLeafCount, passed } = validation;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Tag color={passed ? 'success' : 'error'}>
          {passed ? '✅ 校验通过' : '❌ 校验未通过'}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>
          span leaf 包裹: {spanLeafCount} 处
        </Text>
      </div>

      {errors.map((err, i) => (
        <Alert
          key={`err-${i}`}
          type="error"
          message={err}
          showIcon
          style={{ marginBottom: 4, fontSize: 12 }}
          banner
        />
      ))}

      {warnings.map((warn, i) => (
        <Alert
          key={`warn-${i}`}
          type="warning"
          message={warn}
          showIcon
          style={{ marginBottom: 4, fontSize: 12 }}
          banner
        />
      ))}
    </div>
  );
}
