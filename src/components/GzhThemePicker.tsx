'use client';

import { Typography, Tag } from 'antd';
import type { GzhThemeMeta, GzhThemeId } from '@/types/gzh';

const { Text } = Typography;

interface GzhThemePickerProps {
  themes: GzhThemeMeta[];
  selected: GzhThemeId | null;
  onSelect: (themeId: GzhThemeId) => void;
}

export default function GzhThemePicker({ themes, selected, onSelect }: GzhThemePickerProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
      {themes.map(theme => {
        const isActive = selected === theme.id;
        return (
          <div
            key={theme.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(theme.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(theme.id); }}
            style={{
              border: isActive ? `2px solid ${theme.primaryColor}` : '1px solid #d9d9d9',
              borderRadius: 8,
              padding: '10px 12px',
              cursor: 'pointer',
              background: isActive ? `${theme.primaryColor}08` : '#fff',
              transition: 'border-color 0.2s, background 0.2s',
              outline: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: theme.primaryColor, flexShrink: 0,
              }} />
              <Text strong style={{ fontSize: 13 }}>{theme.name}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.4, display: 'block' }}>
              {theme.usageScenario.length > 30 ? theme.usageScenario.slice(0, 30) + '...' : theme.usageScenario}
            </Text>
          </div>
        );
      })}
    </div>
  );
}
